# Desktop App Downloads

Place your built desktop app files here:

- `edLEAD-Admin-Windows.zip` - Windows installer (zip containing the .exe)
- `edLEAD-Admin-macOS.zip` - macOS installer (zip containing the .dmg)

## How to create these files:

1. Build your Electron app using the commands in ELECTRON_SETUP.md
2. Zip the resulting installers:
   - Windows: Zip the `edLEAD Admin Setup.exe` file
   - macOS: Zip the `edLEAD Admin.dmg` file
3. Rename to match the expected filenames above
4. Place them in this folder

The download button in the admin portal will now trigger direct downloads.
