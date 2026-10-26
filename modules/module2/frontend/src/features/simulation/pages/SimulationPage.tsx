import React from "react";
import { useSearchParams } from "react-router-dom";
import { SimulationWorkspace } from "../components/SimulationWorkspace";

export const SimulationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("jobId") || undefined;

  return <SimulationWorkspace camJobId={jobId} />;
};
