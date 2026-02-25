import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Wrench,
  Users,
  Truck,
  Receipt,
  TrendingUp,
  Settings,
  CreditCard,
  FileText,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  MessageSquareWarning,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FeedbackDialog } from "@/components/feedback/FeedbackDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
import { useAllowedPages } from "@/hooks/useTeam";
import { useLanguage } from "@/contexts/LanguageContext";

const navigationKeys = [
  { key: "nav.dashboard", href: "/", icon: LayoutDashboard },
  { key: "nav.pos", href: "/pos", icon: ShoppingCart },
  { key: "nav.repairs", href: "/repairs", icon: Wrench },
  { key: "nav.inventory", href: "/inventory", icon: Package },
  { key: "nav.customers", href: "/customers", icon: Users },
  { key: "nav.suppliers", href: "/suppliers", icon: Truck },
  { key: "nav.expenses", href: "/expenses", icon: Receipt },
  { key: "nav.debts", href: "/customer-debts", icon: CreditCard },
  { key: "nav.invoices", href: "/invoices", icon: FileText },
  { key: "nav.statistics", href: "/statistics", icon: BarChart3 },
  { key: "nav.profit", href: "/profit", icon: TrendingUp },
];

const bottomNavKeys = [
  { key: "nav.settings", href: "/settings", icon: Settings },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
  onMobileClose?: () => void;
}

export function AppSidebar({ collapsed, onToggle, isMobile, onMobileClose }: AppSidebarProps) {
  const location = useLocation();
  const { settings } = useShopSettingsContext();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { allowedPages } = useAllowedPages();
  const { t } = useLanguage();

  const navigation = navigationKeys.map((item) => ({ ...item, name: t(item.key) }));
  const bottomNav = bottomNavKeys.map((item) => ({ ...item, name: t(item.key) }));

  // Filter navigation based on allowed pages
  const filteredNavigation = allowedPages
    ? navigation.filter((item) => allowedPages.includes(item.href))
    : navigation;

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const NavItem = ({ item }: { item: typeof navigation[0] }) => {
    const active = isActive(item.href);
    const Icon = item.icon;

    const linkContent = (
      <NavLink
        to={item.href}
        onClick={isMobile ? onMobileClose : undefined}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          active && "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft",
          !active && "text-sidebar-foreground/80",
          collapsed && !isMobile && "justify-center px-2"
        )}
      >
        <Icon className={cn("h-5 w-5 shrink-0", active && "text-sidebar-primary-foreground")} />
        {(!collapsed || isMobile) && (
          <span className="truncate">{item.name}</span>
        )}
      </NavLink>
    );

    if (collapsed && !isMobile) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.name}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed && !isMobile ? "w-16" : "w-64",
        isMobile && "w-64"
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center h-16 px-4 border-b border-sidebar-border shrink-0",
        collapsed && !isMobile ? "justify-center" : "justify-between"
      )}>
        {(!collapsed || isMobile) && (
          <div className="flex items-center gap-2">
            {(settings as any).logo_url ? (
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                <img src={(settings as any).logo_url} alt="Logo" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-primary">
                <Smartphone className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-semibold text-sidebar-foreground text-sm truncate max-w-[140px]">{settings.shop_name}</span>
              <span className="text-[10px] text-sidebar-foreground/60">Tunisie</span>
            </div>
          </div>
        )}
        {collapsed && !isMobile && (
          (settings as any).logo_url ? (
            <div className="w-9 h-9 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              <img src={(settings as any).logo_url} alt="Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-primary">
              <Smartphone className="h-5 w-5 text-primary-foreground" />
            </div>
          )
        )}
        {/* Toggle button - moved after logo block */}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className={cn(
              "h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
              collapsed && "hidden"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {filteredNavigation.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </nav>
      </ScrollArea>

      {/* Bottom Navigation */}
      <div className="px-3 py-3 border-t border-sidebar-border space-y-1">
        {/* Feedback Button */}
        <button
          onClick={() => setFeedbackOpen(true)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all w-full",
            "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed && !isMobile && "justify-center px-2"
          )}
        >
          <MessageSquareWarning className="h-5 w-5 shrink-0" />
          {(!collapsed || isMobile) && <span className="truncate">{t("nav.feedback")}</span>}
        </button>
        {bottomNav.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}
      </div>

      {/* Expand Button (when collapsed) */}
      {collapsed && !isMobile && (
        <div className="px-3 pb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="w-full h-9 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </aside>
  );
}
