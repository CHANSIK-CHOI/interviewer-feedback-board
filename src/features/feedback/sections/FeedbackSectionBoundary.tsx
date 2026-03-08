import React, { ReactNode, Suspense } from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";

type FeedbackSectionBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
  errorFallback: ({ error, reset }: { error: Error; reset: () => void }) => ReactNode;
};

export default function FeedbackSectionBoundary({
  children,
  fallback,
  errorFallback,
}: FeedbackSectionBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ error, resetErrorBoundary }) =>
            errorFallback({
              error: error instanceof Error ? error : new Error("Unknown error"),
              reset: resetErrorBoundary,
            })
          }
        >
          <Suspense fallback={fallback}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
