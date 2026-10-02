// src/hooks/usePageTitle.ts
import { useEffect } from "react";

const APP_NAME = "TicketStream";

export const usePageTitle = (title: string) => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} | ${APP_NAME}` : APP_NAME;

    return () => {
      document.title = previousTitle; // restore when leaving the page
    };
  }, [title]);
};

export default usePageTitle;