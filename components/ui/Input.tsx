'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const inputVariants = cva(
  'flex w-full rounded-lg border bg-white transition-colors placeholder:text-secondary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-secondary-300 focus-visible:ring-primary-500 focus-visible:border-primary-500',
        error: 'border-red-300 focus-visible:ring-red-500 focus-visible:border-red-500',
        success: 'border-green-300 focus-visible:ring-green-500 focus-visible:border-green-500',
      },
      size: {
        sm: 'h-8 px-2 text-xs',
        md: 'h-10 px-3 text-sm',
        lg: 'h-12 px-4 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, size, label, error, helperText, id, ...props }, ref) => {
    const computedVariant = error ? 'error' : variant;
    
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block mb-2 text-sm font-semibold text-secondary-700">
            {label}
          </label>
        )}
        <input
          id={id}
          className={cn(inputVariants({ variant: computedVariant, size, className }))}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-secondary-500">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input, inputVariants };
