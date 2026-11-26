import { Routes } from '@angular/router';

export const BACKUP_ROUTES: Routes = [
  {
    path: '',
    title: 'backups.title',
    loadComponent: () => import('./backup-home/backup-home').then((m) => m.BackupHomeComponent),
  },
];
