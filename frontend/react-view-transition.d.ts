// React's <ViewTransition> ships in the experimental channel that Next swaps in
// when `experimental.viewTransition` is enabled (see next.config.ts). The stable
// @types/react doesn't declare it yet, so we augment the module for the types.
import type { FC, ReactNode } from "react";

declare module "react" {
  export interface ViewTransitionProps {
    children?: ReactNode;
    name?: string;
    enter?: string | Record<string, string>;
    exit?: string | Record<string, string>;
    share?: string;
    update?: string | Record<string, string>;
    default?: string;
    onEnter?: (element: Element, types: string[]) => void;
    onExit?: (element: Element, types: string[]) => void;
    onShare?: (element: Element, types: string[]) => void;
    onUpdate?: (element: Element, types: string[]) => void;
  }
  export const ViewTransition: FC<ViewTransitionProps>;
}
