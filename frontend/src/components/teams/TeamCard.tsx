"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  FileEdit,
  Trash2,
  Users,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Team {
  id: number;
  name: string;
  code: string;
  description?: string;
  team_lead?: {
    id: number;
    first_name: string;
    last_name: string;
    profile_photo_path?: string;
    designation?: string;
  };
  members_count?: number;
  members?: any[];
  performance_metrics?: {
    attendance_rate?: number;
    approval_speed?: number;
    leave_balance_health?: number;
  };
}

interface TeamCardProps {
  team: Team;
  onEdit: (teamId: number) => void;
  onDelete: (teamId: number) => void;
  onDragStart?: (e: React.DragEvent, teamId: number) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, teamId: number) => void;
  isDragging?: boolean;
}

export function TeamCard({
  team,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
}: TeamCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  const getPerformanceBadges = () => {
    const badges = [];
    const metrics = team.performance_metrics;

    if (metrics?.attendance_rate && metrics.attendance_rate >= 95) {
      badges.push({
        label: "Highest Attendance",
        icon: TrendingUp,
        color: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
      });
    }

    if (metrics?.approval_speed && metrics.approval_speed <= 24) {
      badges.push({
        label: "Fastest Approvals",
        icon: Clock,
        color: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
      });
    }

    if (metrics?.leave_balance_health && metrics.leave_balance_health >= 80) {
      badges.push({
        label: "Healthy Balances",
        icon: CheckCircle2,
        color: "bg-purple-500/20 text-purple-600 dark:text-purple-400",
      });
    }

    return badges;
  };

  const performanceBadges = getPerformanceBadges();
  const displayMembers = team.members?.slice(0, 4) || [];

  return (
    <div
      draggable
      onDragStart={onDragStart ? (e) => onDragStart(e, team.id) : undefined}
      onDragOver={onDragOver}
      onDrop={onDrop ? (e) => onDrop(e, team.id) : undefined}
      className={`bg-white dark:bg-slate-800/50 border-2 border-slate-200 dark:border-white/10 rounded-xl overflow-hidden hover:shadow-lg transition-all ${
        isDragging ? "opacity-50 scale-95" : ""
      } ${onDragStart ? "cursor-move" : ""}`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 px-6 py-4 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                {team.name}
              </h3>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-mono font-semibold rounded">
                {team.code}
              </span>
            </div>
            {team.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                {team.description}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-lg transition-colors">
              <MoreHorizontal className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(team.id)}>
                <FileEdit className="mr-2 h-4 w-4" /> Edit Team
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600 dark:text-red-400"
                onClick={() => onDelete(team.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete Team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Team Lead Section */}
      {team.team_lead && (
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-3">
            Team Lead
          </p>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-amber-400/30">
              <AvatarImage
                src={team.team_lead.profile_photo_path}
                alt={team.team_lead.first_name}
              />
              <AvatarFallback>
                {team.team_lead.first_name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {team.team_lead.first_name} {team.team_lead.last_name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {team.team_lead.designation || "Team Lead"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Members Preview Section */}
      {displayMembers.length > 0 && (
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-3">
            Team Members
          </p>
          <div className="flex items-center gap-2">
            {displayMembers.map((member, index) => (
              <Avatar
                key={member.id}
                className="h-8 w-8 border-2 border-white dark:border-slate-700"
                title={`${member.first_name} ${member.last_name}`}
              >
                <AvatarImage
                  src={member.profile_photo_path}
                  alt={member.first_name}
                />
                <AvatarFallback className="text-xs bg-slate-200 dark:bg-slate-600">
                  {member.first_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
            ))}
            {(team.members_count || 0) > 4 && (
              <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200 border-2 border-white dark:border-slate-700">
                +{(team.members_count || 0) - 4}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Performance Badges Section */}
      {performanceBadges.length > 0 && (
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-3">
            Performance
          </p>
          <div className="flex flex-wrap gap-2">
            {performanceBadges.map((badge, index) => {
              const Icon = badge.icon;
              return (
                <div
                  key={index}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 ${badge.color}`}
                >
                  <Icon className="h-4 w-4" />
                  {badge.label}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer with Stats */}
      <div className="px-6 py-4 bg-slate-50 dark:bg-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-500" />
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {team.members_count || 0}
            </span>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Members
            </span>
          </div>

          {team.members && team.members.length > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expanded Members List */}
      {isExpanded && team.members && team.members.length > 0 && (
        <div className="px-6 py-4 bg-slate-50 dark:bg-white/5 border-t border-slate-200 dark:border-white/10 space-y-2 max-h-64 overflow-y-auto">
          {team.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 p-2 rounded hover:bg-white dark:hover:bg-slate-800/50 transition-colors"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={member.profile_photo_path}
                  alt={member.first_name}
                />
                <AvatarFallback className="text-xs">
                  {member.first_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {member.first_name} {member.last_name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {member.designation || "Employee"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
