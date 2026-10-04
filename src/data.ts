export type LessonSection = 'previous' | 'current' | 'next';

export type ScheduleItem = {
  time: string;
  title: string;
  detail: string;
  tone: 'school' | 'project' | 'work';
  isCourse?: boolean;
};

export type LessonNote = {
  date: string;
  heading: string;
  items: string[];
};

export const demoSchedule: ScheduleItem[] = [
  {
    time: '09:10',
    title: 'Webアプリ開発',
    detail: '対面・302教室',
    tone: 'school',
    isCourse: true,
  },
  {
    time: '13:00',
    title: 'グループ開発',
    detail: 'オンライン・Zoom',
    tone: 'project',
  },
  {
    time: '18:00',
    title: 'バイト',
    detail: 'マック・出勤',
    tone: 'work',
  },
];

export const lessonNotes: Record<LessonSection, LessonNote> = {
  previous: {
    date: '10月1日',
    heading: 'Reactのコンポーネント設計',
    items: ['コンポーネントの役割', 'Propsで値を受け渡す', '画面を小さな単位に分ける'],
  },
  current: {
    date: '10月4日',
    heading: '状態管理の基礎',
    items: ['stateの基本', '入力内容を画面へ反映する', 'コンポーネント間の状態を整理する'],
  },
  next: {
    date: '10月8日',
    heading: 'Firebaseとの連携',
    items: ['Firestoreへの保存', 'データの取得と表示', '認証の導入'],
  },
};

export const demoTasks = [
  {
    id: 'database-report',
    title: 'DB課題を提出する',
    context: 'Webアプリ開発・課題',
    deadline: '10/5',
  },
  {
    id: 'group-material',
    title: 'グループ開発の資料を確認する',
    context: 'グループ開発・自習',
    deadline: '今日',
  },
  {
    id: 'lesson-review',
    title: '授業メモを整理する',
    context: 'Webアプリ開発',
    deadline: '10/9',
  },
];

export const quickLinks = [
  { name: 'Zoom', kind: '授業・会議', mark: 'Z', href: 'https://zoom.us/', tone: 'blue' },
  { name: 'Teams', kind: '会議', mark: 'T', href: 'https://teams.microsoft.com/', tone: 'violet' },
  { name: 'Classroom', kind: '授業', mark: 'C', href: 'https://classroom.google.com/', tone: 'green' },
  { name: 'Gmail', kind: 'メール', mark: 'M', href: 'https://mail.google.com/', tone: 'coral' },
  { name: 'GitHub', kind: '開発', mark: 'GH', href: 'https://github.com/', tone: 'slate' },
  { name: 'Figma', kind: 'デザイン', mark: 'F', href: 'https://www.figma.com/', tone: 'amber' },
  { name: '学校ポータル', kind: '学校', mark: '学', href: 'https://example.com/', tone: 'cyan' },
];
