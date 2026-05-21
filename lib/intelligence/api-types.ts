import type {
  TierPrecision, ReGrading, CategoryCalibration, DataCoverage, ConversionStats, TopSource,
} from "./queries";
import type { ChangelogEntry } from "@/lib/ai/version";

/** Shape returned by GET /api/admin/intelligence. */
export interface IntelligenceStats {
  month: string | null;
  precision: TierPrecision[];
  regrading: ReGrading;
  calibration: CategoryCalibration[];
  coverage: DataCoverage;
  topSource: TopSource | null;
  conversion: { current: ConversionStats; previous: ConversionStats | null };
  version: { current: string; changelog: ChangelogEntry[] };
}
