'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { WorkerProfile, WORKERS as INITIAL_WORKERS } from '@/features/job-sites/data/job-sites';

interface JobSitesContextType {
    workers: WorkerProfile[];
    addWorker: (worker: WorkerProfile) => void;
}

const JobSitesContext = createContext<JobSitesContextType | undefined>(undefined);

export function JobSitesProvider({ children }: { children: ReactNode }) {
    const [workers, setWorkers] = useState<WorkerProfile[]>(INITIAL_WORKERS);

    const addWorker = (worker: WorkerProfile) => {
        setWorkers((prev) => [worker, ...prev]);
    };

    return (
        <JobSitesContext.Provider value={{ workers, addWorker }}>
            {children}
        </JobSitesContext.Provider>
    );
}

export function useJobSites() {
    const context = useContext(JobSitesContext);
    if (context === undefined) {
        throw new Error('useJobSites must be used within a JobSitesProvider');
    }
    return context;
}
