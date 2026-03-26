export type RouteMeta = {
  titleKey: string;
  subtitleKey: string;
  breadcrumbKey: string;
};

export const ROUTE_META: Record<string, RouteMeta> = {
  '/': {
    titleKey: 'header.routes.dashboard.title',
    subtitleKey: 'header.routes.dashboard.subtitle',
    breadcrumbKey: 'header.routes.dashboard.breadcrumb',
  },
  '/machines': {
    titleKey: 'header.routes.machines.title',
    subtitleKey: 'header.routes.machines.subtitle',
    breadcrumbKey: 'header.routes.machines.breadcrumb',
  },
  '/energy': {
    titleKey: 'header.routes.energy.title',
    subtitleKey: 'header.routes.energy.subtitle',
    breadcrumbKey: 'header.routes.energy.breadcrumb',
  },
  '/oee': {
    titleKey: 'header.routes.oee.title',
    subtitleKey: 'header.routes.oee.subtitle',
    breadcrumbKey: 'header.routes.oee.breadcrumb',
  },
  '/tools': {
    titleKey: 'header.routes.tools.title',
    subtitleKey: 'header.routes.tools.subtitle',
    breadcrumbKey: 'header.routes.tools.breadcrumb',
  },
  '/maintenance': {
    titleKey: 'header.routes.maintenance.title',
    subtitleKey: 'header.routes.maintenance.subtitle',
    breadcrumbKey: 'header.routes.maintenance.breadcrumb',
  },
  '/alarms': {
    titleKey: 'header.routes.alarms.title',
    subtitleKey: 'header.routes.alarms.subtitle',
    breadcrumbKey: 'header.routes.alarms.breadcrumb',
  },
  '/settings': {
    titleKey: 'header.routes.settings.title',
    subtitleKey: 'header.routes.settings.subtitle',
    breadcrumbKey: 'header.routes.settings.breadcrumb',
  },
};

export const getRouteMeta = (pathname: string): RouteMeta => {
  const direct = ROUTE_META[pathname];
  if (direct) return direct;

  const matchedPrefix = Object.keys(ROUTE_META)
    .filter((route) => route !== '/' && pathname.startsWith(route))
    .sort((a, b) => b.length - a.length)[0];

  if (matchedPrefix) return ROUTE_META[matchedPrefix];
  return ROUTE_META['/'];
};

export const getBreadcrumbKeys = (pathname: string) => {
  const rootKey = ROUTE_META['/'].breadcrumbKey;
  if (pathname === '/') {
    return [rootKey];
  }

  const meta = getRouteMeta(pathname);
  return [rootKey, meta.breadcrumbKey];
};

