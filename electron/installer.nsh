; electron-builder does not reject an ARM64-only package on x64 Windows.
; Its extraction step then skips the payload and fails later at resources\icon.ico.
; Reject the incompatible package before the wizard or old-version uninstall runs.
!macro customInit
  !ifdef APP_ARM64
    !ifndef APP_64
      !ifndef APP_32
        ${IfNot} ${IsNativeARM64}
          ${IfNot} ${Silent}
            MessageBox MB_OK|MB_ICONSTOP "此安装包仅适用于 ARM64 Windows。$\r$\n$\r$\nIntel / AMD 电脑请下载文件名包含 x64-setup.exe 的安装包。$\r$\n$\r$\nThis installer requires ARM64 Windows. On Intel / AMD PCs, download the x64-setup.exe installer."
          ${EndIf}
          SetErrorLevel 1633 ; ERROR_INSTALL_PLATFORM_UNSUPPORTED
          Quit
        ${EndIf}
      !endif
    !endif
  !endif
!macroend
