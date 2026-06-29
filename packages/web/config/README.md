# Navigation Configuration

This module provides configurable navigation items for the application header.

## Overview

Navigation is configured through `NavigationConfig` objects containing `NavigationItem` arrays. Items can be enabled/disabled individually using the `enabled` property.

## Usage

### Using Default Navigation

```tsx
import { Header } from "@/components/header";

export default function Page() {
  return <Header />;
}
```

### Custom Navigation

```tsx
import { Header } from "@/components/header";
import { NavigationConfig } from "@/config/navigation";

const customNavigation: NavigationConfig = {
  items: [
    {
      name: "Home",
      href: "/",
      icon: <HomeIcon />,
    },
    {
      name: "Profile",
      href: "/profile",
      icon: <UserIcon />,
    },
  ],
};

export default function Page() {
  return <Header navigationConfig={customNavigation} />;
}
```

### Disabling Items

Individual navigation items can be disabled by setting `enabled: false`:

```tsx
import { Header } from "@/components/header";
import { NavigationConfig } from "@/config/navigation";

const navigation: NavigationConfig = {
  items: [
    {
      name: "Admin",
      href: "/admin",
      enabled: false, // This item will be hidden
    },
  ],
};

export default function Page() {
  return <Header navigationConfig={navigation} />;
}
```

### Via MainLayout

```tsx
import { MainLayout } from "@/components/main-layout";

export default function Page() {
  return (
    <MainLayout headerProps={{ 
      navigationConfig: myCustomConfig 
    }}>
      {/* page content */}
    </MainLayout>
  );
}
```

## API

### NavigationItem

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| name | string | Yes | Display name |
| href | string | Yes | URL path |
| icon | ReactNode | No | Optional icon element |
| enabled | boolean | No | Whether item is visible (default: true) |

### NavigationConfig

| Property | Type | Description |
|----------|------|-------------|
| items | NavigationItem[] | Array of navigation items |