import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { buildAnalyticsPayload, rememberTrackedRoute } from "@/lib/analytics";

const AnalyticsTracker = () => {
  const location = useLocation();
  const trackPageView = useMutation(api.analytics.trackPageView);

  useEffect(() => {
    let isActive = true;

    const trackRoute = async () => {
      try {
        const payload = await buildAnalyticsPayload(window.location, document.referrer);

        if (!isActive || !payload) {
          return;
        }

        const result = await trackPageView(payload);

        if (result?.tracked) {
          rememberTrackedRoute(payload.route);
        }
      } catch (error) {
        console.error("Analytics tracking failed", error);
      }
    };

    void trackRoute();

    return () => {
      isActive = false;
    };
  }, [location.pathname, trackPageView]);

  return null;
};

export default AnalyticsTracker;
