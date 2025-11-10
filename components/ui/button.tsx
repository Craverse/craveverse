/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

// Simple hash function for deterministic IDs (no Math.random)
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36).substring(0, 6);
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // Get data-button-id from props if provided
    const providedId = (props as any)['data-button-id'] as string | undefined;
    
    // Generate deterministic button ID for testing (only on client after hydration)
    const [buttonId, setButtonId] = React.useState<string | undefined>(providedId);
    
    React.useEffect(() => {
      // Only generate ID on client side after hydration
      if (!buttonId && typeof window !== 'undefined') {
        // Extract button text for deterministic ID
        let buttonText = '';
        if (typeof props.children === 'string') {
          buttonText = props.children;
        } else if (React.isValidElement(props.children)) {
          // Try to extract text from React elements
          const extractText = (node: React.ReactNode): string => {
            if (typeof node === 'string') return node;
            if (typeof node === 'number') return node.toString();
            if (React.isValidElement(node)) {
              const nodeProps = node.props as any;
              if (nodeProps?.children) {
                return extractText(nodeProps.children);
              }
            }
            return '';
          };
          buttonText = extractText(props.children);
        }
        
        // Create deterministic ID from button text and onClick handler
        const textSlug = buttonText.replace(/\s+/g, '-').toLowerCase().substring(0, 20) || 'btn';
        const onClickName = props.onClick?.toString() || '';
        const hash = hashString(textSlug + onClickName);
        setButtonId(`btn-${textSlug}-${hash}`);
      }
    }, [buttonId, props.children, props.onClick]);
    
    // Add data attributes for testing (only if ID exists to avoid hydration mismatch)
    const dataProps = {
      ...props,
      ...(buttonId && {
        'data-button-id': buttonId,
        'data-button-type': asChild ? 'link' : 'button',
      } as any),
    };
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...dataProps}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

/* eslint-enable react-refresh/only-export-components */









