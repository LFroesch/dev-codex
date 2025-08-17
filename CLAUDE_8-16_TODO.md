# CLAUDE Changes
- [ ] Toasts Manager
- [ ] Notifications not working like if you log in and the notification hasnt been sent to you yet it should, idk somethings wrong
- [ ] Help/Info Page Implemented
- [ ] Performance analytics and metrics tune up - on admin / user / per project / debloat
- [ ] Import/export project data [also overall data/input sanitization/validation / safety]
- [ ] Refactor & Clean Code: Fix any repetition / unused code / debugs / console logs / fix comments / etc
- [ ] TTL / garbage collection on db info, keep it from bloating, tracking unnecessary shit for now
- [ ] Add checkboxes to enhancedtexteditor.tsx buttons

## Manual Changes / Phase 2
- [ ] Mobile/smaller window improvements
- [ ] Small Checkover of Each section
- [ ] Rate/Plan Limiting: Implement proper rate and plan tier limits for important user & project functions
- [ ] Backup systems: mongodb?
- [ ] Go through and check for Consistent button, bar, background, border, shadow, etc styling and interactions
- [ ] Improve/consolidate Export Sections a little bit
- [ ] 2nd Nav Bar also locked to top?
- [ ] check box implemented in notes -> todo etc
- [ ] Not 30 Days, All time as default metric period
- [ ] My Projects Page UI update
- [ ] Keybinds

## Far Future ?
- [ ] Deployment Page Monitoring / Logging hook implementation?

1. Toasts Manager

  - What specific improvements do you want beyond the existing toast system? (centralized management, queuing, persistence, etc.)
  I want centralized management, and positioning, high z value middle top of the visible screen, instead of a set position on the page
  - Should toasts have actions/buttons (undo, retry, etc.)?
  No just basic toasts
  - Any specific styling changes needed?
  No the styling has been good I just want them to be more prominent

  2. Notifications Issues

  - What specific login notifications should be sent? (welcome email, login alerts, etc.)
  no i'm saying that the notification system for todos seems a little wonky, it doesn't fully work, and I'd like to be  able to add more notifications, so maybe some sort of more centralized system to manage them?
  - Are you referring to the NotificationBell component or email notifications?
  notificationbell component
  - Should notifications be real-time (socket) or polling-based?
  i recently added sockets for other things, so maybe we use socket now, currently it has been polling i think?

  3. Help/Info Page

  - What content should be included? (user guide, FAQ, contact info, etc.)
  just basic guide to the site including links around the site
  - Should it be a modal, separate page, or integrated component?
  seperate page, the dummy page for it exists at HelpPage.tsx

  4. Performance Analytics

  - What metrics do you want to track? (page load times, API response times, user actions, etc.)
  load times, user actions, idk talk to me more about this, its currently just seems a bit bloated
  - Should this be client-side only or include server metrics?
  look at my entire analytics for both admin and settingspage.tsx stuff and talk to me about it
  - Do you want a dashboard or just data collection?
  we have both already now, i just want it better
  - What "debloating" specifically needs to happen?
  idk you tell me after you check it out, then ask more questions we'll get there!

  5. Import/Export

    This section already exists, but there isnt an IMPORT part, and also it would need input validation
    the import section should allow you to paste in basically what our export json gives you, but this allows for people to save and reupload their own data / do version control etc, it would overwrite the current project and update each field in accordance to the imports fields
    let me know if this seems like a waste to do but idk it seems kinda good, the input validation is important though

  6. Code Cleanup

  - Any specific areas of concern or should I scan the entire codebase?
  Whole codebase
  - Should I remove all console.logs or keep some for debugging?
  Remove them all for now any that I have in currently were just for development
  - Any specific coding standards to follow?
  idk industry standard?

  7. TTL/Garbage Collection

  - Which database collections need TTL? (logs, sessions, temp data, etc.)
  Idk check over my backend and see whats up, I'm using mongodb online and just dont want to cost myself an arm and a leg when i deploy and bring on multiple users etc
  - What retention periods do you want?
  Industry standard, i may want to increase the TTL later on or based on plan pricing but for now lets do it simply
  - Should old data be archived or permanently deleted?
  Deleted

  8. EnhancedTextEditor Checkboxes

  - What specific buttons need checkboxes?
  no like add a button to add a markdown checkbox-> [ ]
  - Should they be toggle states or just visual indicators?
  just read enhancedtexteditor.tsx then you'll know what i mean, also noteitem.tsx because it needs to display them correctly
  they arent meant to be functional check boxes, just markdown [ ] [x] you can manually put in an x yknow?

  Which items should I prioritize and what are your preferences for the above questions?