import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Sampler, Company, SampleRequest, AppSettings, Coordinates } from '../types';
import { REGIONAL_AQUACULTURE_HUBS, parseNumericTonnage } from '../utils/geoUtils';

const DEFAULT_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

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

// Starts completely blank — user can add them if they want
export const INITIAL_COMPANIES: Company[] = [];

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
  addCompany: (newComp: Omit<Company, 'id'>) => void;
  deleteCompany: (id: string) => void;
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

  // Companies state (starts blank, user can add custom companies)
  const [companies, setCompanies] = useState<Company[]>(() => {
    const saved = localStorage.getItem('nsp_companies');
    if (!saved) return INITIAL_COMPANIES;
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Discard any legacy seeded mock companies
        return parsed.filter(
          (c: any) =>
            c &&
            c.name &&
            !c.name.toLowerCase().includes('sigma') &&
            !c.name.toLowerCase().includes('devi') &&
            !c.name.toLowerCase().includes('apex') &&
            !c.name.toLowerCase().includes('sandhya') &&
            !c.name.toLowerCase().includes('nsp lab')
        );
      }
      return INITIAL_COMPANIES;
    } catch {
      return INITIAL_COMPANIES;
    }
  });

  // Sample requests state (clean out any legacy test samples)
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
    } catch {
      return [];
    }
  });

  // Settings state (no hardcoded API keys)
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('nsp_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure no legacy leaked hardcoded API key lingers in localStorage
        if (parsed.googleMapsApiKey) {
          parsed.googleMapsApiKey = DEFAULT_API_KEY;
        }
        return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return {
      googleMapsApiKey: DEFAULT_API_KEY,
      mapCenter: { lat: 16.5449, lng: 81.5212 }, // Bhimavaram center
      mapZoom: 12,
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
      status: 'assigned',
      assignedSamplerId: samplerId,
      tonnageNumber: tonnage,
      createdAt: new Date().toISOString()
    };

    // 1. Add request
    setRequests((prev) => [newReq, ...prev]);

    // 2. Move sampler location to this pond
    setSamplers((prev) =>
      prev.map((s) => {
        if (s.id === samplerId) {
          return {
            ...s,
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
                subLocation,
                coords,
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
    setRequests([]);
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const deleteSampleRequest = (id: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
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

  const addCompany = (newComp: Omit<Company, 'id'>) => {
    const created: Company = {
      ...newComp,
      id: `comp-${Date.now()}`
    };
    setCompanies((prev) => [...prev, created]);
  };

  const deleteCompany = (id: string) => {
    setCompanies((prev) => prev.filter((c) => c.id !== id));
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
        markSampleCollected,
        addCompany,
        deleteCompany
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
