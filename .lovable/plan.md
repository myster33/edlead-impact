## Replace Programme dropdown image in navbar

The "Programme" menu dropdown (in `src/components/layout/Navbar.tsx`) currently shows the `programmeConference` image alongside the "Leadership Programme" title and description. Swap that image for the newly uploaded photo.

### Steps

1. Save the uploaded image to `src/assets/programme-dropdown.jpg`.
2. In `src/components/layout/Navbar.tsx`:
   - Replace the `programmeConference` import with `import programmeDropdown from "@/assets/programme-dropdown.jpg";`
   - Update the `<img src={...}>` on line 103 to use `programmeDropdown`.
3. Leave the title, description, badge, and all other dropdowns unchanged.