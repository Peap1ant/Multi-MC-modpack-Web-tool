export interface SavedPreset {
  id: string;
  name: string;
  createdAt: string;
  version: string;
  data: {
    materials: Array<{
      name: string;
      color: string;
      minRatio: string | number;
      maxRatio: string | number;
    }>;
    targetAlloyName: string;
    ingotPerName: string;
  };
}
