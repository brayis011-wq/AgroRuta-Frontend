import { Routes } from '@angular/router';

export const BACKUP_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./backup-home/backup-home').then((m) => m.BackupHomeComponent),
  },
];
