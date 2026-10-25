import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Sampler, Company, SampleRequest, AppSettings, Coordinates } from '../types';
import { REGIONAL_AQUACULTURE_HUBS, parseNumericTonnage } from '../utils/geoUtils';

const DEFAULT_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyB-YwGXSHF_lJEp18w6-Z4i2ZJhTQQSteI';

export const INITIAL_SAMPLERS: Sampler[] = [
  {
    id: 'sampler-1',
    name: 'Ramesh',
    phone: '+919848012345',
    homeBase: {
      name: 'Bhimavaram',
      coords: REGIONAL_AQUACULTURE_HUBS['bhimavaram']
    },
    currentLocation: {
      name: 'Bhimavaram',
      coords: REGIONAL_AQUACULTURE_HUBS['bhimavaram']
    },
    color: '#2563eb', // Royal Blue
    status: 'available',
    activeAssignments: []
  },
  {
    id: 'sampler-2',
    name: 'Suresh',
    phone: '+919848023456',
    homeBase: {
      name: 'Narasapuram',
      coords: REGIONAL_AQUACULTURE_HUBS['narasapuram']
    },
    currentLocation: {
      name: 'Narasapuram',
      coords: REGIONAL_AQUACULTURE_HUBS['narasapuram']
    },
    color: '#16a34a', // Emerald Green
    status: 'available',
    activeAssignments: []
  },
  {
    id: 'sampler-3',
    name: 'Naidu',
    phone: '+919848034567',
    homeBase: {
      name: 'Palakol',
      coords: REGIONAL_AQUACULTURE_HUBS['palakol']
    },
    currentLocation: {
      name: 'Palakol',
      coords: REGIONAL_AQUACULTURE_HUBS['palakol']
    },
    color: '#9333ea', // Vivid Purple
    status: 'available',
    activeAssignments: []
  }
];

export const INITIAL_COMPANIES: Company[] = [
  { id: 'comp-1', name: 'Sigma sea foods', whatsappGroup: 'Sigma Sea Foods Group' },
  { id: 'comp-2', name: 'Devi Sea Foods', whatsappGroup: 'Devi Sea Foods Lab Group' },
  { id: 'comp-3', name: 'Apex Frozen Foods', whatsappGroup: 'Apex Aquaculture Group' },
  { id: 'comp-4', name: 'Sandhya Aqua', whatsappGroup: 'Sandhya Aqua Testing' },
  { id: 'comp-5', name: 'NSP Lab Direct', whatsappGroup: 'NSP Samplers' }
];

interface AppContextType {
  samplers: Sampler[];
  companies: Company[];
  requests: SampleRequest[];
  settings: AppSettings;
  createAndAssignSample: (
    reqData: Omit<SampleRequest, 'id' | 'createdAt' | 'status'>,
    samplerId: string
  ) => SampleRequest;
  updateSamplerLocation: (samplerId: string, locationName: string, coords: Coordinates, subLocation?: string) => void;
  updateSampler: (updated: Sampler) => void;
  setAllSamplers: (newSamplers: Sampler[]) => void;
  setAllRequests: (newRequests: SampleRequest[]) => void;
  addSampler: (newSampler: Omit<Sampler, 'id' | 'activeAssignments'>) => void;
  deleteSampler: (samplerId: string) => void;
  resetAllSamplersToHome: () => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  deleteSampleRequest: (id: string) => void;
  markSampleCollected: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Samplers state
  const [samplers, setSamplers] = useState<Sampler[]>(() => {
    const saved = localStorage.getItem('nsp_samplers');
    if (!saved) return INITIAL_SAMPLERS;
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : INITIAL_SAMPLERS;
    } catch (e) {
      console.error('Could not read saved samplers, restoring defaults:', e);
      return INITIAL_SAMPLERS;
    }
  });

  // Companies state (read-only seeded list — no UI writes to it)
  const [companies] = useState<Company[]>(() => {
    const saved = localStorage.getItem('nsp_companies');
    if (!saved) return INITIAL_COMPANIES;
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : INITIAL_COMPANIES;
    } catch (e) {
      console.error('Could not read saved companies, restoring defaults:', e);
      return INITIAL_COMPANIES;
    }
  });

  // Sample requests state (clean out any legacy test samples like GNR Kuppanapudi)
  const [requests, setRequests] = useState<SampleRequest[]>(() => {
    const saved = localStorage.getItem('nsp_requests');
    if (!saved) return [];
    try {
      const parsed: SampleRequest[] = JSON.parse(saved);
      return parsed.filter(
        (r) =>
          !(
            r.farmerCode?.toLowerCase() === 'gnr' ||
            r.locationName?.toLowerCase().includes('kuppanapudi')
          )
      );
    } catch (e) {
      return [];
    }
  });

  // Settings state
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('nsp_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {
      googleMapsApiKey: DEFAULT_API_KEY,
      mapCenter: { lat: 16.5449, lng: 81.5212 }, // Bhimavaram center
      mapZoom: 11,
      mapTypeId: 'hybrid'
    };
  });

  // Persistence effects
  useEffect(() => {
    localStorage.setItem('nsp_samplers', JSON.stringify(samplers));
  }, [samplers]);

  useEffect(() => {
    localStorage.setItem('nsp_companies', JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    localStorage.setItem('nsp_requests', JSON.stringify(requests));
  }, [requests]);

  useEffect(() => {
    localStorage.setItem('nsp_settings', JSON.stringify(settings));
  }, [settings]);

  /**
   * ATOMIC: Creates a new sample request and immediately assigns it to the given sampler,
   * updating BOTH the sample list AND moving the sampler's current location to the pond!
   */
  const createAndAssignSample = (
    reqData: Omit<SampleRequest, 'id' | 'createdAt' | 'status'>,
    samplerId: string
  ): SampleRequest => {
    const sampleId = `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const tonnage = reqData.tonnageNumber ?? parseNumericTonnage(reqData.countTons);

    const newReq: SampleRequest = {
      ...reqData,
      id: sampleId,
      assignedSamplerId: samplerId,
      status: 'assigned',
      tonnageNumber: tonnage,
      createdAt: new Date().toISOString()
    };

    // 1. Update requests state
    setRequests((prev) => [newReq, ...prev]);

    // 2. Dynamic Sampler Movement: Move sampler's current location directly to this new pond!
    setSamplers((prev) =>
      prev.map((s) => {
        if (s.id === samplerId) {
          return {
            ...s,
            status: 'busy',
            currentLocation: {
              name: reqData.locationName,
              subLocation: reqData.subLocation,
              coords: reqData.coords,
              lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            },
            activeAssignments: [...s.activeAssignments, sampleId]
          };
        }
        return s;
      })
    );

    return newReq;
  };

  const updateSamplerLocation = (
    samplerId: string,
    locationName: string,
    coords: Coordinates,
    subLocation?: string
  ) => {
    setSamplers((prev) =>
      prev.map((s) =>
        s.id === samplerId
          ? {
              ...s,
              currentLocation: {
                name: locationName,
                coords,
                subLocation,
                lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            }
          : s
      )
    );
  };

  const updateSampler = (updated: Sampler) => {
    setSamplers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const setAllSamplers = (newSamplers: Sampler[]) => {
    setSamplers(newSamplers);
  };

  const setAllRequests = (newRequests: SampleRequest[]) => {
    setRequests(newRequests);
  };

  const addSampler = (newSampler: Omit<Sampler, 'id' | 'activeAssignments'>) => {
    const created: Sampler = {
      ...newSampler,
      id: `sampler-${Date.now()}`,
      activeAssignments: []
    };
    setSamplers((prev) => [...prev, created]);
  };

  const deleteSampler = (samplerId: string) => {
    setSamplers((prev) => prev.filter((s) => s.id !== samplerId));
    // Return this sampler's samples to 'pending' so no request points at a deleted sampler
    setRequests((prev) =>
      prev.map((r) =>
        r.assignedSamplerId === samplerId
          ? { ...r, assignedSamplerId: undefined, status: 'pending' }
          : r
      )
    );
  };

  const resetAllSamplersToHome = () => {
    setSamplers((prev) =>
      prev.map((s) => ({
        ...s,
        status: 'available',
        currentLocation: {
          name: s.homeBase.name,
          coords: s.homeBase.coords,
          lastUpdated: 'Start of Day'
        },
        activeAssignments: []
      }))
    );
    // Clear the day's samples (the persistence effect writes the empty list back to localStorage)
    setRequests([]);
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const deleteSampleRequest = (id: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
    // Also drop it from any sampler's active-assignment list
    setSamplers((prev) =>
      prev.map((s) =>
        s.activeAssignments.includes(id)
          ? { ...s, activeAssignments: s.activeAssignments.filter((a) => a !== id) }
          : s
      )
    );
  };

  const markSampleCollected = (id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'collected' } : r))
    );
  };

  return (
    <AppContext.Provider
      value={{
        samplers,
        companies,
        requests,
        settings,
        createAndAssignSample,
        updateSamplerLocation,
        updateSampler,
        setAllSamplers,
        setAllRequests,
        addSampler,
        deleteSampler,
        resetAllSamplersToHome,
        updateSettings,
        deleteSampleRequest,
        markSampleCollected
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
