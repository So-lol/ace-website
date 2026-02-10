import { CheckCircle2 } from 'lucide-react'
import { stepLabels, stepIcons, TOTAL_STEPS } from './types'

interface FormProgressProps {
    currentStep: number
}

export function FormProgress({ currentStep }: FormProgressProps) {
    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
                {stepLabels.map((label, i) => {
                    const Icon = stepIcons[i]
                    const isActive = currentStep === i + 1
                    const isCompleted = currentStep > i + 1
                    return (
                        <div
                            key={label}
                            className="flex flex-col items-center gap-1 flex-1"
                        >
                            <div
                                className={`
                                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                                    transition-all duration-300
                                    ${isCompleted
                                        ? 'doraemon-gradient text-white scale-90'
                                        : isActive
                                            ? 'doraemon-gradient text-white scale-110 doraemon-glow'
                                            : 'bg-muted text-muted-foreground'
                                    }
                                `}
                            >
                                {isCompleted ? (
                                    <CheckCircle2 className="w-5 h-5" />
                                ) : (
                                    <Icon className="w-5 h-5" />
                                )}
                            </div>
                            <span className={`text-xs font-medium hidden sm:block ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                                {label}
                            </span>
                        </div>
                    )
                })}
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                    className="h-full doraemon-gradient rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${((currentStep - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
                />
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
                Step {currentStep} of {TOTAL_STEPS}
            </p>
        </div>
    )
}
