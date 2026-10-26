import React from "react";
import { ArrowUpRight, LucideIcon } from "lucide-react";

interface ModuleCardProps {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  badgeText: string;
  badgeColor?: string;
  stats: Array<{ label: string; value: string }>;
  features: string[];
  launchUrl: string;
  accentBorder?: string;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({
  title,
  subtitle,
  description,
  icon: Icon,
  badgeText,
  badgeColor = "text-accent bg-accent/10 border-accent/30",
  stats,
  features,
  launchUrl,
  accentBorder = "hover:border-accent",
}) => {
  return (
    <div
      className={`group relative flex flex-col justify-between bg-surface border border-border rounded-md p-6 transition-all duration-200 hover:shadow-lg ${accentBorder}`}
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded bg-canvas border border-border flex items-center justify-center group-hover:scale-105 transition-transform">
            <Icon className="w-6 h-6 text-accent" />
          </div>
          <span className={`text-[10px] font-mono px-2.5 py-1 rounded border uppercase font-medium tracking-wide ${badgeColor}`}>
            {badgeText}
          </span>
        </div>

        {/* Title & Description */}
        <div className="mb-4">
          <div className="text-[11px] font-mono text-text-muted uppercase tracking-wider mb-0.5">
            {subtitle}
          </div>
          <h3 className="text-xl font-semibold text-text tracking-tight mb-2 group-hover:text-accent transition-colors">
            {title}
          </h3>
          <p className="text-sm text-text-2 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Key Features */}
        <div className="space-y-1.5 mb-6 pt-3 border-t border-border/60">
          <span className="text-[10px] font-mono uppercase text-text-muted tracking-wider block mb-2">
            Core Capabilities
          </span>
          {features.map((feature, i) => (
            <div key={i} className="flex items-center text-xs text-text-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent/70 mr-2 flex-shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        {/* Metrics Grid */}
        {stats.length > 0 && (
          <div className="grid grid-cols-3 gap-2 py-3 px-3 bg-canvas rounded border border-border mb-5">
            {stats.map((stat, i) => (
              <div key={i} className="flex flex-col">
                <span className="text-[10px] font-mono text-text-muted truncate">{stat.label}</span>
                <span className="text-sm font-semibold font-mono text-text mt-0.5">{stat.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action Button */}
        <a
          href={launchUrl}
          className="flex items-center justify-center space-x-2 w-full py-2.5 px-4 rounded bg-raised hover:bg-accent text-text hover:text-accent-fg border border-border hover:border-accent text-sm font-medium transition-all shadow-sm group-hover:bg-accent group-hover:text-accent-fg"
        >
          <span>Launch Module</span>
          <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      </div>
    </div>
  );
};
