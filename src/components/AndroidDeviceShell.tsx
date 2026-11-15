import React from 'react';

interface AndroidDeviceShellProps {
  children: React.ReactNode;
  isAndroidView?: boolean;
  setIsAndroidView?: (val: boolean) => void;
}

export const AndroidDeviceShell: React.FC<AndroidDeviceShellProps> = ({ children }) => {
  return (
    <div className="w-full flex flex-col min-h-screen">
      <div className="flex-1 flex flex-col pb-16 md:pb-0">
        {children}
      </div>
    </div>
  );
};
