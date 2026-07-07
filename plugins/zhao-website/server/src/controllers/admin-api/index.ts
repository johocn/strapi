import article from "./article";
import generic from "./generic";
import knowledgeGraph from "./knowledge-graph";
import firstTruth from "./first-truth";
import aiContentSummary from "./ai-content-summary";
import studioBridge from "./studio-bridge";
import stats from "./stats";

export default {
  article,
  ...generic,
  "knowledge-graph": knowledgeGraph,
  "first-truth": firstTruth,
  "ai-content-summary": aiContentSummary,
  "studio-bridge": studioBridge,
  stats,
};
