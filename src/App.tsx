import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserProvider } from "@/context/UserContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import ConnectivityToast from "@/components/ConnectivityToast";
import Index from "./pages/Index.tsx";
import AppScreen from "./pages/AppScreen.tsx";
import GraphQLSecurityDocs from "./pages/GraphQLSecurityDocs.tsx";
import AIVisionDocs from "./pages/AIVisionDocs.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const App = () => (
  <ErrorBoundary fallbackMessage="RecycleMate encountered an unexpected error. Please refresh to continue.">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <UserProvider>
          <Toaster />
          <Sonner />
          <ConnectivityToast />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/app" element={<AppScreen />} />
              <Route path="/docs/graphql-security" element={<GraphQLSecurityDocs />} />
              <Route path="/docs/ai-vision" element={<AIVisionDocs />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </UserProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
