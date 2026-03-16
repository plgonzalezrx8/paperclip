import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { TooltipProvider } from "../components/ui/tooltip";

export function renderWithQueryClient(node: ReactElement) {
  // Disable retries so failing async expectations surface immediately in tests.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>{node}</TooltipProvider>
      </QueryClientProvider>,
    ),
  };
}
