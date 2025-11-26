import React, { useState, useEffect } from 'react';
import { teamAPI, TeamMember } from '../api';

interface TeamMemberSelectProps {
  projectId: string;
  value?: string;
  onChange: (userId: string | undefined) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  isSharedProject: boolean;
  required?: boolean;
}

const TeamMemberSelect: React.FC<TeamMemberSelectProps> = ({
  projectId,
  value,
  onChange,
  label = "Assigned To",
  placeholder = "Select team member...",
  className = "",
  required = false
}) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setError(null);
        const response = await teamAPI.getMembers(projectId);
        setMembers(response.members);
      } catch (err: any) {
        setError('Failed to load team members');
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [projectId]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    onChange(selectedValue === '' ? undefined : selectedValue);
  };

  // Always render for assignment capability (owner can assign to themselves)
  // if (!isSharedProject) {
  //   return null;
  // }

  return (
    <div className={`form-control ${className}`}>
      <label className="label">
        <span className="label-text font-medium">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </span>
      </label>
      <select
        value={value || ''}
        onChange={handleChange}
        className="select select-bordered select-sm"
        disabled={loading}
        required={required}
      >
        <option value="">{loading ? 'Loading...' : placeholder}</option>
        {!loading && !error && members.map((member) => (
          <option key={member.userId._id} value={member.userId._id}>
            {member.userId.firstName} {member.userId.lastName}
            {member.isOwner && ' (Owner)'}
            {member.role === 'editor' && ' (Editor)'}
            {member.role === 'viewer' && ' (Viewer)'}
          </option>
        ))}
      </select>
      {error && (
        <label className="label">
          <span className="label-text-alt text-error">{error}</span>
        </label>
      )}
      {loading && (
        <label className="label">
          <span className="label-text-alt">
            <span className="loading loading-spinner loading-xs mr-2"></span>
            Loading team members...
          </span>
        </label>
      )}
    </div>
  );
};

export default TeamMemberSelect;