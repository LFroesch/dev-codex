import { Project } from '../../models/Project';

export interface TestProjectData {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  color?: string;
  ownerId: string;
  teamMembers?: Array<{
    userId: string;
    role: 'owner' | 'admin' | 'member' | 'viewer';
  }>;
}

/**
 * Creates a test project in the database
 */
export async function createTestProject(
  data: TestProjectData
): Promise<any> {
  const projectData = {
    name: data.name,
    description: data.description || 'Test project description',
    category: data.category || 'Web Development',
    tags: data.tags || ['test'],
    color: data.color || '#FF6B6B',
    ownerId: data.ownerId,
    teamMembers: data.teamMembers || [
      {
        userId: data.ownerId,
        role: 'owner' as const
      }
    ]
  };

  return await Project.create(projectData);
}

/**
 * Creates multiple test projects for a user
 */
export async function createMultipleProjects(
  userId: string,
  count: number
): Promise<any[]> {
  const projects = [];

  for (let i = 0; i < count; i++) {
    const project = await createTestProject({
      name: `Test Project ${i + 1}`,
      description: `Description for project ${i + 1}`,
      ownerId: userId
    });
    projects.push(project);
  }

  return projects;
}

/**
 * Creates a project with team members
 */
export async function createSharedProject(
  ownerId: string,
  memberIds: string[],
  memberRole: 'admin' | 'member' | 'viewer' = 'member'
): Promise<any> {
  const teamMembers = [
    { userId: ownerId, role: 'owner' as const },
    ...memberIds.map(id => ({ userId: id, role: memberRole }))
  ];

  return createTestProject({
    name: 'Shared Test Project',
    ownerId,
    teamMembers
  });
}
