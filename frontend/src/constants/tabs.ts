export const TAB_IDS = {
  HOME: "Home",
  TFC_ALLOY: "TFC_TFC-Alloy",
  ETC_AUTOMATION_CALCULATOR: "ETC_Automation-Calculator"
} as const;

export type AppTabId = typeof TAB_IDS[keyof typeof TAB_IDS];

export type AppMenuTabItem = {
  type: "tab";
  id: AppTabId;
  labelKey: "home";
};

export type AppMenuCategoryItem = {
  type: "category";
  id: "TFC" | "etc";
  labelKey: "tfc" | "etc";
  children: Array<{
    id: AppTabId;
    labelKey: "tfcAlloy" | "automationCalculator";
  }>;
};

export type AppMenuItem = AppMenuTabItem | AppMenuCategoryItem;

export const APP_MENU_ITEMS: AppMenuItem[] = [
  {
    type: "tab",
    id: TAB_IDS.HOME,
    labelKey: "home"
  },
  {
    type: "category",
    id: "TFC",
    labelKey: "tfc",
    children: [
      {
        id: TAB_IDS.TFC_ALLOY,
        labelKey: "tfcAlloy"
      }
    ]
  },
  {
    type: "category",
    id: "etc",
    labelKey: "etc",
    children: [
      {
        id: TAB_IDS.ETC_AUTOMATION_CALCULATOR,
        labelKey: "automationCalculator"
      }
    ]
  }
];

export const DEFAULT_APP_TAB_ID: AppTabId = TAB_IDS.HOME;
