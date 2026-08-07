import { createContext, useCallback, useState } from "react";
import { getCaseById, updateCaseStatus } from "../services/caseService.js";

export const CaseContext = createContext(null);

/**
 * Holds whichever case is currently "open" as the user moves between
 * Daily Triage -> Case Detail -> Human Review, so navigating between
 * those pages doesn't require re-fetching or passing case data through
 * route params/prop drilling.
 */
export function CaseProvider({ children }) {
  const [activeCase, setActiveCase] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const openCase = useCallback(async (caseId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCaseById(caseId);
      setActiveCase(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const setActiveCaseStatus = useCallback(
    async (status) => {
      if (!activeCase) return;
      await updateCaseStatus(activeCase.id, status);
      setActiveCase((prev) => (prev ? { ...prev, status } : prev));
    },
    [activeCase]
  );

  const clearCase = useCallback(() => setActiveCase(null), []);

  return (
    <CaseContext.Provider value={{ activeCase, loading, error, openCase, setActiveCaseStatus, clearCase }}>
      {children}
    </CaseContext.Provider>
  );
}
