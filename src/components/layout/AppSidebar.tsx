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
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navigation = [
  { name: "Tableau de bord", href: "/", icon: LayoutDashboard },
  { name: "Point de Vente", href: "/pos", icon: ShoppingCart },
  { name: "Réparations", href: "/repairs", icon: Wrench },
  { name: "Stock", href: "/inventory", icon: Package },
  { name: "Clients", href: "/customers", icon: Users },
  { name: "Fournisseurs", href: "/suppliers", icon: Truck },
  { name: "Dépenses", href: "/expenses", icon: Receipt },
  { name: "Dettes Clients", href: "/customer-debts", icon: CreditCard },
  { name: "Factures", href: "/invoices", icon: FileText },
  { name: "Statistiques", href: "/statistics", icon: BarChart3 },
  { name: "Profit", href: "/profit", icon: TrendingUp },
];

const bottomNav = [
  { name: "Paramètres", href: "/settings", icon: Settings },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
  onMobileClose?: () => void;
}

export function AppSidebar({ collapsed, onToggle, isMobile, onMobileClose }: AppSidebarProps) {
  const location = useLocation();

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
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-primary">
              <Smartphone className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sidebar-foreground text-sm">RepairPro</span>
              <span className="text-[10px] text-sidebar-foreground/60">Tunisie</span>
            </div>
          </div>
        )}
        {collapsed && !isMobile && (
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-primary">
            <Smartphone className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
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
          {navigation.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </nav>
      </ScrollArea>

      {/* Bottom Navigation */}
      <div className="px-3 py-3 border-t border-sidebar-border">
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
    </aside>
  );
}
