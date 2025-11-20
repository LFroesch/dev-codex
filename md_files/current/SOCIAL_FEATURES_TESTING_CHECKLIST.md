# Social Features - Quality Assurance Checklist

Use this checklist to verify everything works properly before production.

## 🎯 Core Functionality Tests

### Posts
- [ ] **Create post** (profile post)
  - [ ] Text-only post saves correctly
  - [ ] Post appears on your profile
  - [ ] Post appears in followers' feeds
  - [ ] Character limit enforced (2000 chars)

- [ ] **Create project update** (project post)
  - [ ] Can select project from dropdown
  - [ ] Post appears on project public page
  - [ ] Post appears in followers' feeds who favorited the project
  - [ ] Project link works correctly

- [ ] **Edit post**
  - [ ] Can edit your own posts
  - [ ] Shows "(edited)" marker
  - [ ] Cannot edit others' posts

- [ ] **Delete post**
  - [ ] Can delete your own posts
  - [ ] Cannot delete others' posts
  - [ ] Post disappears from all feeds

### Comments
- [ ] **Comment on project**
  - [ ] Can comment on public projects
  - [ ] Comment appears immediately
  - [ ] Project owner gets notification
  - [ ] Cannot comment on private projects (unless member)

- [ ] **Reply to comment**
  - [ ] Reply appears nested under parent
  - [ ] Parent comment author gets notification
  - [ ] Threading works correctly

- [ ] **Edit comment**
  - [ ] Can edit own comments
  - [ ] Shows "(edited)" marker

- [ ] **Delete comment**
  - [ ] Author can delete own comments
  - [ ] Project owner can delete any comments
  - [ ] Shows "[deleted]" instead of content

### Favorites
- [ ] **Favorite project**
  - [ ] Can favorite any public project
  - [ ] Can favorite own projects
  - [ ] Can favorite team projects
  - [ ] Project owner gets notification (if not self)
  - [ ] Favorite button shows correct state

- [ ] **Unfavorite project**
  - [ ] Button updates correctly
  - [ ] Removed from favorites list

- [ ] **View favorites**
  - [ ] Can see list of favorited projects
  - [ ] Projects link correctly

### Follows
- [ ] **Follow user**
  - [ ] Can follow any public user
  - [ ] User gets notification
  - [ ] Cannot follow yourself
  - [ ] Follow button updates

- [ ] **Unfollow user**
  - [ ] Button updates correctly
  - [ ] Removed from following list

- [ ] **Follow project**
  - [ ] Can follow any public project
  - [ ] Project owner gets notification

- [ ] **View followers/following**
  - [ ] Followers list shows correct users
  - [ ] Following list shows users and projects
  - [ ] Counts are accurate

## 🔔 Notification Tests

### Notification Creation
- [ ] **Comment notification**
  - [ ] First comment: "New comment on ProjectName"
  - [ ] Second comment (within 1h): "2 people commented on ProjectName"
  - [ ] After 1h: New separate notification

- [ ] **Favorite notification**
  - [ ] First favorite: "Someone favorited your project ProjectName"
  - [ ] Multiple favorites: "5 people favorited your project ProjectName"

- [ ] **Follow notifications**
  - [ ] User follow: "Someone started following you"
  - [ ] Project follow: "Someone started following ProjectName"
  - [ ] Aggregates correctly: "3 people started following you"

- [ ] **Reply notification**
  - [ ] Get notified when someone replies to your comment
  - [ ] Aggregates multiple replies

### Notification Interaction
- [ ] **Click notification**
  - [ ] Comment: Goes to public project page
  - [ ] Favorite: Goes to public project page
  - [ ] Follow (user): Goes to user's public profile
  - [ ] Follow (project): Goes to public project page
  - [ ] Marks as read when clicked

- [ ] **Mark as read**
  - [ ] Can mark individual notification as read
  - [ ] Unread count decreases

- [ ] **Clear all**
  - [ ] Clears all notifications
  - [ ] Shows confirmation modal

- [ ] **Real-time updates**
  - [ ] New notifications appear without refresh
  - [ ] Badge count updates live
  - [ ] Updated notifications refresh in list

### Notification Aggregation
- [ ] **Same user multiple actions**
  - [ ] Same person favorites twice → only counted once
  - [ ] Duplicate actions don't inflate count

- [ ] **Mixed types**
  - [ ] Comments and favorites on same project → separate notifications
  - [ ] Each type tracks independently

- [ ] **Re-marking unread**
  - [ ] Read notification becomes unread when updated
  - [ ] Timestamp updates to bubble to top

## 🌐 Public Pages

### Public Profile Page
- [ ] **View own profile**
  - [ ] Shows edit button
  - [ ] Shows all posts
  - [ ] Shows all public projects

- [ ] **View other's profile**
  - [ ] Shows follow button (if logged in)
  - [ ] Shows only public posts (respects visibility)
  - [ ] Shows only public projects
  - [ ] Private profiles show error

- [ ] **Profile elements**
  - [ ] Display name shows correctly
  - [ ] Bio displays if set
  - [ ] Member since date
  - [ ] Public slug/username
  - [ ] Posts section loads
  - [ ] Projects grid loads

### Public Project Page
- [ ] **View project**
  - [ ] Shows project details
  - [ ] Comments section loads
  - [ ] Can add comment (if logged in)
  - [ ] Favorite button works
  - [ ] Follow button works

- [ ] **Project visibility**
  - [ ] Public projects viewable by anyone
  - [ ] Private projects show 403/404

## 📱 Activity Feed

### Feed Content
- [ ] **Shows correct posts**
  - [ ] Posts from followed users
  - [ ] Updates from favorited projects
  - [ ] Own posts
  - [ ] Respects visibility settings

- [ ] **Shows correct activity**
  - [ ] Comments on your projects
  - [ ] Favorites on your projects
  - [ ] Aggregates correctly

### Feed Filters
- [ ] **All filter**
  - [ ] Shows everything

- [ ] **Posts filter**
  - [ ] Shows only posts (user + project updates)

- [ ] **Comments filter**
  - [ ] Shows only comments

- [ ] **Favorites filter**
  - [ ] Shows only favorites

### Feed Interactions
- [ ] **Clickable elements**
  - [ ] User names link to profiles (if public)
  - [ ] Project names link to public pages
  - [ ] Post content readable

- [ ] **Empty states**
  - [ ] Shows helpful message when feed empty
  - [ ] Suggests actions (follow users, favorite projects)

## 🔒 Privacy & Permissions

### Access Control
- [ ] **Public projects**
  - [ ] Anyone can view
  - [ ] Anyone can comment
  - [ ] Anyone can favorite

- [ ] **Private projects**
  - [ ] Only owner and members can view
  - [ ] Only owner and members can comment
  - [ ] Cannot be favorited by outsiders

- [ ] **Profile privacy**
  - [ ] Private profiles not accessible via /discover/user/
  - [ ] Public profiles show correct info

### Authorization
- [ ] **Comment permissions**
  - [ ] Can only edit/delete own comments
  - [ ] Project owner can delete any comment
  - [ ] Non-owners cannot delete others' comments

- [ ] **Post permissions**
  - [ ] Can only edit/delete own posts
  - [ ] Cannot edit/delete others' posts

- [ ] **Follow permissions**
  - [ ] Cannot follow yourself
  - [ ] Can follow any public user/project

## 🚀 Performance & UX

### Loading States
- [ ] **Posts loading**
  - [ ] Shows loading spinner
  - [ ] Doesn't block UI

- [ ] **Comments loading**
  - [ ] Shows loading state
  - [ ] Handles errors gracefully

- [ ] **Activity feed loading**
  - [ ] Shows loading spinner
  - [ ] Handles empty states

### Error Handling
- [ ] **404 errors**
  - [ ] User not found shows friendly message
  - [ ] Project not found shows friendly message

- [ ] **403 errors**
  - [ ] Private profile shows "This profile is private"
  - [ ] No access to project shows appropriate message

- [ ] **500 errors**
  - [ ] No 500 errors on favorites (fixed!)
  - [ ] No 500 errors on comments (fixed!)
  - [ ] No 500 errors on follows (fixed!)

### Real-time Features
- [ ] **Socket connection**
  - [ ] Connects automatically
  - [ ] Reconnects after disconnect

- [ ] **Live updates**
  - [ ] New notifications appear live
  - [ ] Notification count updates
  - [ ] No page refresh needed

## 🎨 UI/UX Polish

### Visual Consistency
- [ ] **Buttons**
  - [ ] Favorite button consistent styling
  - [ ] Follow button consistent styling
  - [ ] State changes clear (favorited vs not)

- [ ] **Cards**
  - [ ] Post cards formatted consistently
  - [ ] Comment cards nested properly
  - [ ] Project cards uniform

### Responsive Design
- [ ] **Mobile**
  - [ ] Activity feed readable on mobile
  - [ ] Buttons accessible
  - [ ] No horizontal scroll

- [ ] **Tablet**
  - [ ] Proper grid layouts
  - [ ] Touch targets adequate

- [ ] **Desktop**
  - [ ] Uses available space
  - [ ] Not too wide

### Empty States
- [ ] **No posts**
  - [ ] Shows friendly message
  - [ ] Suggests creating first post

- [ ] **No followers**
  - [ ] Suggests finding users to follow

- [ ] **No favorites**
  - [ ] Suggests exploring projects

- [ ] **No comments**
  - [ ] Shows "Be the first to comment"

## 🧹 Data Quality

### Cleanup & Consistency
- [ ] **Deleted content**
  - [ ] Soft-deleted comments show "[deleted]"
  - [ ] Deleted posts removed from feeds
  - [ ] No orphaned data

- [ ] **User references**
  - [ ] All user display names consistent
  - [ ] Username/real name preference respected

- [ ] **Timestamps**
  - [ ] Relative times accurate ("2 hours ago")
  - [ ] Full timestamps on hover

## 🔍 Edge Cases

### Unusual Scenarios
- [ ] **Rapid actions**
  - [ ] Favorite/unfavorite/favorite → handles correctly
  - [ ] Multiple quick comments → aggregates properly

- [ ] **Concurrent users**
  - [ ] Two people favoriting simultaneously
  - [ ] Multiple comments at same time

- [ ] **Empty data**
  - [ ] User with no bio
  - [ ] Project with no description
  - [ ] No tags, no technologies

- [ ] **Long content**
  - [ ] Very long post (near 2000 chars)
  - [ ] Very long comment (near 5000 chars)
  - [ ] Long project names

- [ ] **Special characters**
  - [ ] Emojis in posts 😊
  - [ ] Special chars in names
  - [ ] Code snippets in comments

## ✅ Pre-Production Checklist

Before deploying:
- [ ] All critical tests passing
- [ ] No console errors on any page
- [ ] No 500 errors in any flow
- [ ] Notifications working correctly
- [ ] Real-time updates functioning
- [ ] All public pages load
- [ ] Privacy settings respected
- [ ] Database indexes created
- [ ] Error logging active
- [ ] Analytics tracking social actions

## 🎯 Quality Standards

For the social features to not feel "sloppy":

**Must Have**:
- ✅ No 500 errors
- ✅ Notifications don't spam
- ✅ Aggregation works correctly
- ✅ Privacy respected
- ✅ Real-time updates work
- ✅ All buttons have correct states
- ✅ Loading states everywhere
- ✅ Error messages helpful

**Should Have**:
- Empty states with helpful messages
- Consistent styling
- Fast loading times
- Mobile responsive
- Keyboard accessible
- Screen reader friendly

**Nice to Have**:
- Animations/transitions
- Optimistic UI updates
- Infinite scroll
- Search functionality

---

Go through this checklist systematically. Any item that fails needs to be fixed before calling it production-ready. This will ensure the social features feel polished, not sloppy.
