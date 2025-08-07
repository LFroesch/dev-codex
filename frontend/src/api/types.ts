// Re-export shared types with legacy names for components that haven't been updated yet
export type {
  BaseUser as User,
  BaseProject as Project,
  BaseNote as Note,
  BaseTodo as Todo,
  BaseDevLogEntry as DevLogEntry,
  BaseDoc as Doc,
  BaseLink as Link,
  BaseSelectedTechnology as SelectedTechnology,
  BaseSelectedPackage as SelectedPackage,
  BaseTeamMember as TeamMember,
  BaseProjectInvitation as ProjectInvitation,
  BaseNotification as Notification,
  InviteUserData
} from '../../../shared/types';