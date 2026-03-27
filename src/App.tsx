import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { UserProvider } from "@/context/UserContext";
import Index from "./pages/Index.tsx";
import AppScreen from "./pages/AppScreen.tsx";
import AuthPage from "./pages/AuthPage.tsx";
import GraphQLSecurityDocs from "./pages/GraphQLSecurityDocs.tsx";
import AIVisionDocs from "./pages/AIVisionDocs.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <UserProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/app" element={<AppScreen />} />
              <Route path="/docs/graphql-security" element={<GraphQLSecurityDocs />} />
              <Route path="/docs/ai-vision" element={<AIVisionDocs />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </UserProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
