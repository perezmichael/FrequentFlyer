'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import StepBasics from './create/StepBasics';
import StepDetails from './create/StepDetails';
import StepProfile from './create/StepProfile';
import StepPortfolio from './create/StepPortfolio';
import StepPreview from './create/StepPreview';
import styles from './OnboardingWizard.module.css';
import { WorkerProfile } from '@/features/job-sites/data/job-sites';

export type OnboardingData = Partial<WorkerProfile>;

const STEPS = [
    { id: 'basics', label: 'Basics' },
    { id: 'details', label: 'Work Details' },
    { id: 'profile', label: 'Profile Info' },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'preview', label: 'Preview' },
];

export default function OnboardingWizard() {
    const [currentStep, setCurrentStep] = useState(0);
    const [data, setData] = useState<OnboardingData>({
        type: [],
        certifications: [],
        gallery: [],
        pastProjects: [],
        availability: 'Available Now',
        unionStatus: 'Non-Union',
        radius: '25 miles',
    });

    const updateData = (newData: Partial<OnboardingData>) => {
        setData((prev) => ({ ...prev, ...newData }));
    };

    const nextStep = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep((prev) => prev + 1);
            window.scrollTo(0, 0);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep((prev) => prev - 1);
            window.scrollTo(0, 0);
        }
    };

    const progress = ((currentStep + 1) / STEPS.length) * 100;

    return (
        <div className={styles.container}>
            <div className={styles.progressContainer}>
                <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                </div>
                <div className={styles.steps}>
                    {STEPS.map((step, index) => (
                        <span
                            key={step.id}
                            className={`${index === currentStep
                                ? styles.stepActive
                                : index < currentStep
                                    ? styles.stepCompleted
                                    : ''
                                }`}
                        >
                            {step.label}
                        </span>
                    ))}
                </div>
            </div>

            <div className={styles.content}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {currentStep === 0 && <StepBasics data={data} updateData={updateData} />}
                        {currentStep === 1 && <StepDetails data={data} updateData={updateData} />}
                        {currentStep === 2 && <StepProfile data={data} updateData={updateData} />}
                        {currentStep === 3 && <StepPortfolio data={data} updateData={updateData} />}
                        {currentStep === 4 && <StepPreview data={data} />}
                    </motion.div>
                </AnimatePresence>

                <div className={styles.navigation}>
                    <button
                        onClick={prevStep}
                        className={styles.backBtn}
                        style={{ visibility: currentStep === 0 ? 'hidden' : 'visible' }}
                    >
                        Back
                    </button>

                    {currentStep < STEPS.length - 1 && (
                        <button onClick={nextStep} className={styles.nextBtn}>
                            Next Step <ArrowRight size={18} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
