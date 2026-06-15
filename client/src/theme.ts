import type { ThemeConfig } from 'antd';

/**
 * 全局设计令牌 —— 现代、克制、专业的「需求工程工作台」气质。
 * 统一主色（靛蓝）、更圆润的圆角、柔和阴影与精致控件，配合 index.css 的质感打磨。
 */
export const BRAND = {
  primary: '#6366f1',
  primaryHover: '#5457e5',
  primarySoft: '#eef0ff',
  gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
  ink: '#1c1d33',
};

export const themeConfig: ThemeConfig = {
  token: {
    colorPrimary: BRAND.primary,
    colorInfo: BRAND.primary,
    colorLink: BRAND.primary,
    borderRadius: 10,
    fontSize: 14,
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', Roboto, 'Helvetica Neue', Arial, sans-serif",
    colorBgLayout: '#f4f5fb',
    colorTextHeading: BRAND.ink,
    colorText: '#2b2c40',
    colorBorderSecondary: '#eceef5',
    wireframe: false,
    boxShadowTertiary: '0 1px 3px rgba(16, 24, 40, 0.06)',
  },
  components: {
    Layout: {
      headerBg: 'rgba(255, 255, 255, 0.72)',
      siderBg: '#ffffff',
      bodyBg: '#f4f5fb',
      headerHeight: 60,
    },
    Menu: {
      itemBorderRadius: 10,
      itemSelectedBg: BRAND.primarySoft,
      itemSelectedColor: BRAND.primary,
      itemActiveBg: BRAND.primarySoft,
      itemHeight: 42,
      itemMarginInline: 8,
      iconSize: 16,
      subMenuItemBg: 'transparent',
    },
    Card: {
      borderRadiusLG: 16,
      paddingLG: 20,
    },
    Button: {
      controlHeight: 36,
      controlHeightLG: 44,
      fontWeight: 500,
      primaryShadow: '0 4px 12px rgba(99, 102, 241, 0.28)',
      defaultShadow: 'none',
    },
    Input: { borderRadius: 9, controlHeight: 38, activeShadow: '0 0 0 3px rgba(99,102,241,0.12)' },
    Select: { borderRadius: 9, controlHeight: 38 },
    Table: { borderRadiusLG: 14, headerBg: '#f6f7fc', headerColor: '#4a4b63', rowHoverBg: '#f9faff' },
    Tabs: { inkBarColor: BRAND.primary, itemSelectedColor: BRAND.primary },
    Tag: { borderRadiusSM: 6 },
    Segmented: { itemSelectedBg: '#ffffff', trackBg: '#eef0f6', borderRadius: 10 },
    Modal: { borderRadiusLG: 16 },
    Drawer: {},
    Steps: { colorPrimary: BRAND.primary },
  },
};
