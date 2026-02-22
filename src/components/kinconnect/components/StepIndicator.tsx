import React from 'react';
import { AppStep, StepConfig } from '../types';
import { Check, User, Image as ImageIcon, Paintbrush, ShoppingBag, CreditCard } from 'lucide-react';

const STEPS: StepConfig[] = [
  { id: AppStep.UPLOAD, icon: ImageIcon, label: 'Upload' },
  { id: AppStep.ROSTER, icon: User, label: 'Roster' },
  { id: AppStep.DESIGN, icon: Paintbrush, label: 'Design' },
  { id: AppStep.SHOP, icon: ShoppingBag, label: 'Shop' },
  { id: AppStep.CHECKOUT, icon: CreditCard, label: 'Checkout' },
];

interface Props {
  currentStep: AppStep;
  onNavigate?: (step: AppStep) => void;
}

export function StepIndicator({ currentStep, onNavigate }: Props) {
  const stepOrder = [AppStep.LANDING, ...STEPS.map((s) => s.id), AppStep.SUCCESS];
  const currentIndex = stepOrder.indexOf(currentStep);

  if (currentStep === AppStep.LANDING) return null;

  return (
    <div className="w-full max-w-4xl mx-auto mb-8 px-4">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 -z-10 rounded-full" />

        {STEPS.map((step, idx) => {
          const actualIdx = idx + 1; // LANDING is index 0
          const isActive = step.id === currentStep;
          const isCompleted = currentIndex > actualIdx;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onNavigate?.(step.id)}
              disabled={!isCompleted && !isActive}
              className="flex flex-col items-center bg-white px-2 disabled:cursor-not-allowed"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300
                  ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110' :
                    isCompleted ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}
              >
                {isCompleted ? <Check size={20} /> : <step.icon size={20} />}
              </div>
              <span className={`text-xs mt-2 font-medium ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
