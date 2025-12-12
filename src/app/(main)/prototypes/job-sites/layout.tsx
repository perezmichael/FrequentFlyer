'use client';

import { JobSitesProvider } from '@/context/JobSitesContext';

export default function JobSitesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <JobSitesProvider>{children}</JobSitesProvider>;
}
