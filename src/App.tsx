import { Fragment, useEffect, useState, type FormEvent } from 'react';
import {
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  FolderKanban,
  House,
  Link2,
  ListTodo,
  Menu,
  NotebookPen,
  Pencil,
  Plus,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { demoTasks, lessonNotes, quickLinks, type LessonSection } from './data';

type View = 'home' | 'calendar' | 'timetable' | 'subject' | 'tasks' | 'projects' | 'work' | 'finance' | 'links';
type EventCategory = '学校' | 'バイト' | 'プライベート' | 'プロジェクト';
type EventFormat = '対面' | 'オンライン' | 'オンデマンド' | 'その他';
type LifeEvent = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  category: EventCategory;
  format: EventFormat;
  location: string;
};
type EventDraft = Omit<LifeEvent, 'id'>;
type EventDialogMode = 'form' | 'detail' | 'delete' | null;

export type ClassType = 'in_person' | 'zoom' | 'ondemand' | 'other';
export type TimetableDay = '月' | '火' | '水' | '木' | '金';

export interface TimetableItem {
  id: string;
  day: TimetableDay;
  period: number; // 1 | 2 | 3 | 4 | 5
  subject: string;
  startTime: string; // '09:10'
  endTime: string;   // '10:40'
  classType: ClassType; // 'in_person' | 'zoom' | 'ondemand' | 'other'
  classroom?: string;    // 教室名・Zoom/講義リンク・メモ
}

export type TimetableDraft = {
  id?: string;
  day: TimetableDay;
  period: number;
  subject: string;
  startTime: string;
  endTime: string;
  classType: ClassType;
  classroom: string;
};

export type TimetableDialogMode = 'form' | 'detail' | 'delete' | null;

const eventStorageKey = 'integrated_life_os_events';
const timetableStorageKey = 'integrated_life_os_timetable';
const timetableDays: TimetableDay[] = ['月', '火', '水', '木', '金'];

export const classTypeConfig: Record<ClassType, { label: string; shortLabel: string; className: string }> = {
  in_person: { label: '登校（対面）', shortLabel: '登校', className: 'class-type-in-person' },
  zoom: { label: 'オンライン（Zoom）', shortLabel: 'オンライン', className: 'class-type-zoom' },
  ondemand: { label: 'オンデマンド', shortLabel: 'オンデマンド', className: 'class-type-ondemand' },
  other: { label: 'その他', shortLabel: 'その他', className: 'class-type-other' },
};

const defaultPeriodTimes: Record<number, { startTime: string; endTime: string }> = {
  1: { startTime: '09:10', endTime: '10:40' },
  2: { startTime: '10:50', endTime: '12:20' },
  3: { startTime: '13:10', endTime: '14:40' },
  4: { startTime: '14:50', endTime: '16:20' },
  5: { startTime: '16:30', endTime: '18:00' },
};
const eventCategories: EventCategory[] = ['学校', 'バイト', 'プライベート', 'プロジェクト'];
const eventFormats: EventFormat[] = ['対面', 'オンライン', 'オンデマンド', 'その他'];
const eventCategoryTone: Record<EventCategory, string> = {
  学校: 'school',
  バイト: 'work',
  プライベート: 'private',
  プロジェクト: 'project',
};
const schoolPeriods = [
  { period: 1, startTime: '09:10', endTime: '10:40' },
  { period: 2, startTime: '10:50', endTime: '12:20' },
  { period: 3, startTime: '13:10', endTime: '14:40' },
  { period: 4, startTime: '14:50', endTime: '16:20' },
  { period: 5, startTime: '16:30', endTime: '18:00' },
];

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createEmptyEventDraft(date: string): EventDraft {
  return { date, startTime: '09:00', endTime: '10:00', title: '', category: '学校', format: '対面', location: '' };
}

function isStoredLifeEvent(value: unknown): value is LifeEvent {
  if (typeof value !== 'object' || value === null) return false;
  const event = value as Partial<LifeEvent>;
  return typeof event.id === 'string'
    && typeof event.date === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(event.date)
    && typeof event.startTime === 'string'
    && /^([01]\d|2[0-3]):[0-5]\d$/.test(event.startTime)
    && typeof event.endTime === 'string'
    && /^([01]\d|2[0-3]):[0-5]\d$/.test(event.endTime)
    && event.endTime > event.startTime
    && typeof event.title === 'string'
    && eventCategories.includes(event.category as EventCategory)
    && eventFormats.includes(event.format as EventFormat)
    && typeof event.location === 'string';
}

function readStoredEvents(): LifeEvent[] {
  try {
    const storedEvents = window.localStorage.getItem(eventStorageKey);
    if (storedEvents === null) return [];
    const parsedEvents: unknown = JSON.parse(storedEvents);
    return Array.isArray(parsedEvents) ? parsedEvents.filter(isStoredLifeEvent) : [];
  } catch {
    return [];
  }
}

function isStoredTimetableItem(value: unknown): value is TimetableItem {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Partial<TimetableItem>;
  const validDays: TimetableDay[] = ['月', '火', '水', '木', '金'];
  const validClassTypes: ClassType[] = ['in_person', 'zoom', 'ondemand', 'other'];
  return typeof item.id === 'string'
    && validDays.includes(item.day as TimetableDay)
    && typeof item.period === 'number' && item.period >= 1 && item.period <= 5
    && typeof item.subject === 'string'
    && typeof item.startTime === 'string'
    && typeof item.endTime === 'string'
    && validClassTypes.includes(item.classType as ClassType);
}

function readStoredTimetable(): TimetableItem[] {
  try {
    const raw = window.localStorage.getItem(timetableStorageKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isStoredTimetableItem) : [];
  } catch {
    return [];
  }
}

type HomeShortcut = {
  name: string;
  kind: string;
  mark: string;
  href: string;
  tone: string;
  route?: View;
};

const navItems = [
  { id: 'home', label: 'ホーム', icon: House },
  { id: 'calendar', label: 'カレンダー', icon: CalendarDays },
  { id: 'timetable', label: '時間割', icon: BookOpen },
  { id: 'subject', label: '科目', icon: NotebookPen },
  { id: 'tasks', label: 'タスク', icon: ListTodo },
  { id: 'projects', label: 'プロジェクト', icon: FolderKanban },
  { id: 'work', label: 'バイト', icon: BriefcaseBusiness },
  { id: 'finance', label: '収支', icon: Wallet },
  { id: 'links', label: 'リンク', icon: Link2 },
] as const;

const shortcutToneByCategory = {
  '学校': 'blue',
  'オンライン': 'violet',
  'バイト': 'amber',
  '開発': 'slate',
  'その他': 'green',
} as const;

const homeShortcutDefaults: HomeShortcut[] = [
  ...quickLinks
    .filter((link) => ['Teams', 'Classroom', 'Zoom', 'GitHub', 'Gmail'].includes(link.name))
    .map((link) => ({ ...link, name: link.name === 'Classroom' ? 'Google Classroom' : link.name })),
  { name: 'バイト', kind: 'シフト確認', mark: 'B', href: '#work', tone: 'coral', route: 'work' },
];

const lessonTabs: { id: LessonSection; label: string }[] = [
  { id: 'previous', label: '前回' },
  { id: 'current', label: '今回' },
  { id: 'next', label: '次回' },
];

const subjectFollowUpTask = {
  id: 'webapp-data-save',
  title: 'Firebaseのデータ保存を確認する',
  context: 'Webアプリ開発・次回まで',
  deadline: '10/8',
};

const demoProjects = [
  {
    name: 'グループ開発',
    status: '進行中',
    completedStages: 2,
    stages: ['要件整理', '企画・構成', '設計確認', '実装', 'テスト', '発表準備'],
    nextAction: '資料の確認と共有',
    deadline: '10/12',
    relatedTask: 'グループ開発の資料を確認する',
    history: ['10/3 企画と画面構成を確認', '10/5 設計内容を確認中'],
  },
  {
    name: '統合版 Life OS',
    status: '進行中',
    completedStages: 2,
    stages: ['方針整理', '画面構成', 'UI整理', '動作確認', 'データ設計'],
    nextAction: '画面ごとの役割を整理する',
    deadline: '未設定',
    relatedTask: '次の作業をTasksで確認する',
    history: ['10/3 画面構成を決定', '10/5 UIの整理を開始'],
  },
];

type DemoShift = {
  day: string;
  start: string;
  end: string;
  breakMinutes: number;
};

const hourlyRate = 1150;
const demoShifts: DemoShift[] = [
  { day: '月', start: '18:00', end: '22:00', breakMinutes: 0 },
  { day: '水', start: '18:00', end: '22:00', breakMinutes: 0 },
  { day: '金', start: '11:00', end: '20:00', breakMinutes: 60 },
];

type DemoExpense = {
  id: number;
  name: string;
  amount: number;
  category: string;
  date: string;
};

const financeCategories = ['食費', '交通費', '学校', 'バイト関連', '趣味', '日用品', 'バイク', 'その他'];
const initialExpenses: DemoExpense[] = [
  { id: 1, name: '家賃', amount: 32000, category: 'その他', date: '10/1' },
  { id: 2, name: '食費', amount: 7500, category: '食費', date: '10/3' },
  { id: 3, name: '交通費', amount: 2300, category: '交通費', date: '10/4' },
];

function suggestExpenseCategory(name: string) {
  if (/自販機|ラーメン|食事|飲食/.test(name)) return '食費';
  if (/電車|バス|交通|定期/.test(name)) return '交通費';
  if (/教科書|教材|学校/.test(name)) return '学校';
  if (/バイト|勤務/.test(name)) return 'バイト関連';
  if (/バイク|ガソリン|保険|パーツ/.test(name)) return 'バイク';
  if (/日用品|洗剤|薬/.test(name)) return '日用品';
  return 'その他';
}

function getShiftWorkMinutes(shift: DemoShift) {
  const [startHour, startMinute] = shift.start.split(':').map(Number);
  const [endHour, endMinute] = shift.end.split(':').map(Number);
  const durationMinutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  return durationMinutes - shift.breakMinutes;
}

function formatToday(date: Date) {
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
}

function getTaskDeadlineTime(deadline: string, today: Date) {
  if (deadline === '今日') {
    return new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  }

  const match = deadline.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return new Date(today.getFullYear(), Number(match[1]) - 1, Number(match[2])).getTime();
}

function greetingForHour(hour: number) {
  if (hour < 11) return 'おはようございます';
  if (hour < 18) return 'こんにちは';
  return 'こんばんは';
}

function App() {
  const [today, setToday] = useState(() => new Date());
  const [activeView, setActiveView] = useState<View>(() => {
    const hash = window.location.hash.replace('#', '');
    return navItems.some((item) => item.id === hash) ? (hash as View) : 'home';
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => new Date());
  const [visibleCalendarMonth, setVisibleCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [events, setEvents] = useState<LifeEvent[]>(readStoredEvents);
  const [eventDialogMode, setEventDialogMode] = useState<EventDialogMode>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventDraft, setEventDraft] = useState<EventDraft>(() => createEmptyEventDraft(toLocalDateKey(new Date())));
  const [eventFormError, setEventFormError] = useState('');
  const [activeLessonTab, setActiveLessonTab] = useState<LessonSection>('previous');
  const [subjectTaskAdded, setSubjectTaskAdded] = useState(false);
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [taskFilter, setTaskFilter] = useState<'all' | 'open' | 'done'>('all');
  const [expenses, setExpenses] = useState<DemoExpense[]>(initialExpenses);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('その他');
  const [homeShortcuts, setHomeShortcuts] = useState<HomeShortcut[]>(homeShortcutDefaults);
  const [isShortcutFormOpen, setIsShortcutFormOpen] = useState(false);
  const [shortcutName, setShortcutName] = useState('');
  const [shortcutUrl, setShortcutUrl] = useState('');
  const [shortcutMark, setShortcutMark] = useState('');
  const [shortcutCategory, setShortcutCategory] = useState<keyof typeof shortcutToneByCategory>('その他');
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [freeNote, setFreeNote] = useState(() => window.localStorage.getItem('unified-life-os-demo-note') ?? '');
  const [noteSaved, setNoteSaved] = useState(false);

  const [timetable, setTimetable] = useState<TimetableItem[]>(readStoredTimetable);
  const [timetableDialogMode, setTimetableDialogMode] = useState<TimetableDialogMode>(null);
  const [selectedTimetableItem, setSelectedTimetableItem] = useState<TimetableItem | null>(null);
  const [editingTimetableId, setEditingTimetableId] = useState<string | null>(null);
  const [timetableDraft, setTimetableDraft] = useState<TimetableDraft>({
    day: '月',
    period: 1,
    subject: '',
    startTime: '09:10',
    endTime: '10:40',
    classType: 'in_person',
    classroom: '',
  });
  const [timetableFormError, setTimetableFormError] = useState('');

  const dayJaList = ['日', '月', '火', '水', '木', '金', '土'] as const;

  const getMergedScheduleForDate = (targetDate: Date) => {
    const dateKey = toLocalDateKey(targetDate);
    const dayIndex = targetDate.getDay();
    const dayJa = dayJaList[dayIndex];

    const eventItems = events
      .filter((event) => event.date === dateKey)
      .map((event) => ({
        id: `event-${event.id}`,
        source: 'event' as const,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        categoryOrType: event.category,
        formatOrDesc: event.format,
        location: event.location,
        tone: eventCategoryTone[event.category] || 'private',
        event,
        timetableItem: undefined as TimetableItem | undefined,
      }));

    const timetableItems = (dayIndex >= 1 && dayIndex <= 5)
      ? timetable
          .filter((item) => item.day === dayJa)
          .map((item) => ({
            id: `timetable-${item.id}`,
            source: 'timetable' as const,
            title: item.subject,
            startTime: item.startTime,
            endTime: item.endTime,
            categoryOrType: '時間割',
            formatOrDesc: classTypeConfig[item.classType]?.shortLabel || '登校',
            location: item.classroom || '',
            tone: item.classType === 'zoom' ? 'project' : item.classType === 'ondemand' ? 'private' : 'school',
            event: undefined as LifeEvent | undefined,
            timetableItem: item,
          }))
      : [];

    return [...eventItems, ...timetableItems].sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const currentTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
  const todaySchedule = getMergedScheduleForDate(today);
  const nextScheduleItem = todaySchedule.find((item) => item.startTime >= currentTime);
  const nextHomeSchedule = nextScheduleItem ? {
    time: nextScheduleItem.startTime,
    title: nextScheduleItem.title,
    detail: [nextScheduleItem.formatOrDesc, nextScheduleItem.location].filter(Boolean).join(' ・ '),
    isCourse: nextScheduleItem.source === 'timetable' || nextScheduleItem.categoryOrType === '学校',
    tone: nextScheduleItem.tone,
    item: nextScheduleItem,
  } : undefined;
  const tasks = subjectTaskAdded ? [subjectFollowUpTask, ...demoTasks] : demoTasks;
  const nearestTaskDeadline = tasks
    .filter((task) => !completedTaskIds.includes(task.id))
    .sort((first, second) => getTaskDeadlineTime(first.deadline, today) - getTaskDeadlineTime(second.deadline, today))[0]?.deadline ?? '完了';
  const calendarYear = visibleCalendarMonth.getFullYear();
  const calendarMonthIndex = visibleCalendarMonth.getMonth();
  const calendarDaysInMonth = new Date(calendarYear, calendarMonthIndex + 1, 0).getDate();
  const calendarStartOffset = new Date(calendarYear, calendarMonthIndex, 1).getDay();
  const calendarCellCount = Math.ceil((calendarStartOffset + calendarDaysInMonth) / 7) * 7;
  const selectedCalendarDateLabel = new Intl.DateTimeFormat('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(selectedCalendarDate);
  const selectedDaySchedule = getMergedScheduleForDate(selectedCalendarDate);
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;
  const completedTaskCount = tasks.filter((task) => completedTaskIds.includes(task.id)).length;
  const plannedWorkMinutes = demoShifts.reduce((total, shift) => total + getShiftWorkMinutes(shift), 0);
  const plannedWorkPay = Math.round((plannedWorkMinutes * hourlyRate) / 60);
  const monthlyIncome = 84200;
  const monthlyExpenses = expenses.reduce((total, expense) => total + expense.amount, 0);
  const monthlyBalance = monthlyIncome - monthlyExpenses;
  const visibleTasks = tasks.filter((task) => {
    if (taskFilter === 'open') return !completedTaskIds.includes(task.id);
    if (taskFilter === 'done') return completedTaskIds.includes(task.id);
    return true;
  });

  const changeCalendarMonth = (offset: number) => {
    const nextMonth = new Date(calendarYear, calendarMonthIndex + offset, 1);
    setVisibleCalendarMonth(nextMonth);
    setSelectedCalendarDate(nextMonth);
  };

  const selectTodayInCalendar = () => {
    setVisibleCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedCalendarDate(today);
    setSelectedEventId(null);
    setEventDialogMode(null);
  };

  const openCreateEvent = () => {
    setEditingEventId(null);
    setEventDraft(createEmptyEventDraft(toLocalDateKey(selectedCalendarDate)));
    setEventFormError('');
    setEventDialogMode('form');
  };

  const openCreateTimetable = (day: TimetableDay, periodNumber: number) => {
    const def = defaultPeriodTimes[periodNumber] ?? { startTime: '09:10', endTime: '10:40' };
    setEditingTimetableId(null);
    setSelectedTimetableItem(null);
    setTimetableDraft({
      day,
      period: periodNumber,
      subject: '',
      startTime: def.startTime,
      endTime: def.endTime,
      classType: 'in_person',
      classroom: '',
    });
    setTimetableFormError('');
    setTimetableDialogMode('form');
  };

  const openTimetableDetail = (item: TimetableItem) => {
    setSelectedTimetableItem(item);
    setTimetableDialogMode('detail');
  };

  const openEditTimetable = (item: TimetableItem) => {
    setEditingTimetableId(item.id);
    setSelectedTimetableItem(item);
    setTimetableDraft({
      id: item.id,
      day: item.day,
      period: item.period,
      subject: item.subject,
      startTime: item.startTime,
      endTime: item.endTime,
      classType: item.classType,
      classroom: item.classroom || '',
    });
    setTimetableFormError('');
    setTimetableDialogMode('form');
  };

  const saveTimetableItem = (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (timetableDraft.endTime <= timetableDraft.startTime) {
      setTimetableFormError('終了時刻は開始時刻より後にしてください。');
      return;
    }
    const trimmedSubject = timetableDraft.subject.trim();
    if (!trimmedSubject) {
      setTimetableFormError('科目名を入力してください。');
      return;
    }

    const savedItem: TimetableItem = {
      id: editingTimetableId ?? window.crypto?.randomUUID?.() ?? `timetable-${Date.now()}`,
      day: timetableDraft.day,
      period: timetableDraft.period,
      subject: trimmedSubject,
      startTime: timetableDraft.startTime,
      endTime: timetableDraft.endTime,
      classType: timetableDraft.classType,
      classroom: timetableDraft.classroom.trim(),
    };

    setTimetable((current) => {
      if (editingTimetableId) {
        return current.map((item) => (item.id === editingTimetableId ? savedItem : item));
      }
      const existingIndex = current.findIndex((item) => item.day === savedItem.day && item.period === savedItem.period);
      if (existingIndex >= 0) {
        const next = [...current];
        next[existingIndex] = savedItem;
        return next;
      }
      return [...current, savedItem];
    });

    setSelectedTimetableItem(savedItem);
    setTimetableFormError('');
    setTimetableDialogMode('detail');
  };

  const deleteSelectedTimetableItem = () => {
    if (!selectedTimetableItem) return;
    setTimetable((current) => current.filter((item) => item.id !== selectedTimetableItem.id));
    setSelectedTimetableItem(null);
    setTimetableDialogMode(null);
  };

  type MergedScheduleEntry = ReturnType<typeof getMergedScheduleForDate>[number];
  const openMergedScheduleEntry = (entry: MergedScheduleEntry) => {
    if (entry.source === 'timetable' && entry.timetableItem) {
      openTimetableDetail(entry.timetableItem);
    } else if (entry.event) {
      openEventDetails(entry.event);
    }
  };

  const openEventDetails = (event: LifeEvent) => {
    setSelectedEventId(event.id);
    setEventDialogMode('detail');
  };

  const openEditEvent = (event: LifeEvent) => {
    setEditingEventId(event.id);
    setEventDraft({
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      title: event.title,
      category: event.category,
      format: event.format,
      location: event.location,
    });
    setEventFormError('');
    setEventDialogMode('form');
  };

  const saveEvent = (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (eventDraft.endTime <= eventDraft.startTime) {
      setEventFormError('終了時刻は開始時刻より後にしてください。');
      return;
    }

    const trimmedTitle = eventDraft.title.trim();
    if (!trimmedTitle) {
      setEventFormError('予定名を入力してください。');
      return;
    }

    const savedEvent: LifeEvent = {
      ...eventDraft,
      id: editingEventId ?? window.crypto?.randomUUID?.() ?? `event-${Date.now()}`,
      title: trimmedTitle,
      location: eventDraft.location.trim(),
    };
    setEvents((current) => editingEventId
      ? current.map((event) => event.id === editingEventId ? savedEvent : event)
      : [...current, savedEvent]);

    const eventDate = new Date(`${savedEvent.date}T00:00:00`);
    setVisibleCalendarMonth(new Date(eventDate.getFullYear(), eventDate.getMonth(), 1));
    setSelectedCalendarDate(eventDate);
    setSelectedEventId(savedEvent.id);
    setEventFormError('');
    setEventDialogMode('detail');
  };

  const deleteSelectedEvent = () => {
    if (!selectedEventId) return;
    setEvents((current) => current.filter((event) => event.id !== selectedEventId));
    setSelectedEventId(null);
    setEventDialogMode(null);
  };

  useEffect(() => {
    const syncViewFromHistory = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'school') {
        setActiveView('timetable');
      } else if (navItems.some((item) => item.id === hash)) {
        setActiveView(hash as View);
      } else {
        setActiveView('home');
      }
    };

    window.addEventListener('popstate', syncViewFromHistory);
    return () => window.removeEventListener('popstate', syncViewFromHistory);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setToday(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(eventStorageKey, JSON.stringify(events));
    } catch {
      setEventFormError('予定を保存できませんでした。ブラウザの保存領域を確認してください。');
    }
  }, [events]);

  useEffect(() => {
    try {
      window.localStorage.setItem(timetableStorageKey, JSON.stringify(timetable));
    } catch {
      console.error('時間割を保存できませんでした。');
    }
  }, [timetable]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('unified-life-os-demo-note', freeNote);
    setNoteSaved(true);
    const timer = window.setTimeout(() => setNoteSaved(false), 1000);
    return () => window.clearTimeout(timer);
  }, [freeNote]);

  const navigate = (view: View) => {
    setIsMobileMoreOpen(false);
    setActiveView(view);
    window.history.pushState({}, '', `#${view}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };



  const toggleTask = (taskId: string) => {
    setCompletedTaskIds((current) =>
      current.includes(taskId) ? current.filter((id) => id !== taskId) : [...current, taskId],
    );
  };

  const addSubjectFollowUpTask = () => setSubjectTaskAdded(true);

  const addHomeShortcut = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = shortcutName.trim();
    if (!name || !shortcutUrl.trim()) return;

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(shortcutUrl.trim());
    } catch {
      return;
    }
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') return;

    setHomeShortcuts((current) => [
      ...current,
      {
        name,
        kind: shortcutCategory,
        mark: shortcutMark.trim() || name.replace(/\s/g, '').slice(0, 2),
        href: parsedUrl.href,
        tone: shortcutToneByCategory[shortcutCategory],
      },
    ]);
    setShortcutName('');
    setShortcutUrl('');
    setShortcutMark('');
    setShortcutCategory('その他');
    setIsShortcutFormOpen(false);
  };

  const submitExpense = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(expenseAmount);
    if (!expenseName.trim() || !Number.isFinite(amount) || amount <= 0) return;

    setExpenses((current) => [
      {
        id: Date.now(),
        name: expenseName.trim(),
        amount,
        category: expenseCategory,
        date: new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric' }).format(today),
      },
      ...current,
    ]);
    setExpenseName('');
    setExpenseAmount('');
    setExpenseCategory('その他');
    setIsExpenseFormOpen(false);
  };

  const lesson = lessonNotes[activeLessonTab];

  const renderTopBar = (label: string) => (
    <header className="topbar">
      <div className="topbar-location">
        <span className="topbar-dot" />
        <span>{label}</span>
      </div>
      <div className="topbar-actions">
        <span className="today-label">{formatToday(today)}</span>
        <button className="topbar-icon" type="button" aria-label="通知">
          <Bell size={17} />
          <span className="notification-dot" />
        </button>
        <span className="topbar-avatar" aria-label="ユーザー">太</span>
      </div>
    </header>
  );

  const renderHome = () => (
    <section className="page home-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">TODAY</p>
          <h1>今日の状況</h1>
        </div>
        <div className="status-pill">
          <span className="status-sun">☀</span>
          {greetingForHour(today.getHours())}
        </div>
      </div>

      <section className={`panel next-event-panel ${nextHomeSchedule ? 'has-upcoming' : 'is-finished'}`}>
        {nextHomeSchedule && <div className="next-event-time">{nextHomeSchedule.time}</div>}
        <div className="next-event-copy">
          <span>{nextHomeSchedule ? '次の予定' : '今日の予定'}</span>
          <h2>{nextHomeSchedule?.title ?? '今日の予定は終了しました'}</h2>
          <p>{nextHomeSchedule?.detail ?? 'おつかれさまでした'}</p>
        </div>
        {nextHomeSchedule && (
          <button
            className="button button-primary button-small"
            type="button"
            onClick={() => openMergedScheduleEntry(nextHomeSchedule.item)}
          >
            詳細を見る <ChevronRight size={13} />
          </button>
        )}
      </section>

      <div className="home-grid">
        <section className="panel page-panel">
          <div className="panel-header">
            <div className="panel-title-wrap">
              <span className="icon-badge icon-blue"><CalendarDays size={16} /></span>
              <div>
                <h2>今日の予定</h2>
                <small>今日の流れを確認</small>
              </div>
            </div>
            <button className="button button-small" type="button" onClick={() => navigate('calendar')}>
              予定を見る
            </button>
          </div>

          <details className="home-schedule-details">
            <summary>
              <span>今日の予定を展開</span>
              <span>{todaySchedule.length}件 <ChevronRight size={14} /></span>
            </summary>
            <div className="schedule-list compact-list">
              {todaySchedule.map((item) => (
                <div key={item.id} className="schedule-item">
                  <time className="schedule-time">{item.startTime}</time>
                  <span className={`schedule-bar ${item.tone}`} />
                  <div className="schedule-copy">
                    <button
                      type="button"
                      className="schedule-title"
                      onClick={() => openMergedScheduleEntry(item)}
                    >
                      {item.title}
                    </button>
                    <p>{item.endTime}まで ・ {item.formatOrDesc}{item.location ? ` ・ ${item.location}` : ''}</p>
                  </div>
                  <span className="schedule-tag">{item.categoryOrType}</span>
                </div>
              ))}
              {todaySchedule.length === 0 && <p className="calendar-empty-state">今日は予定がありません。</p>}
            </div>
          </details>

        </section>

        <aside className="stacked-side">
          <section className="panel mini-panel">
            <div className="panel-header compact-header">
              <div className="panel-title-wrap">
                <span className="icon-badge icon-violet"><ListTodo size={16} /></span>
                <div>
                  <h2>今日やること</h2>
                  <small>残りのタスク</small>
                </div>
              </div>
              <span className="tiny-badge">{tasks.filter((task) => !completedTaskIds.includes(task.id)).length}</span>
            </div>

            <div className="task-short-list">
              {tasks.slice(0, 3).map((task) => (
                <label key={task.id} className={`task-row ${completedTaskIds.includes(task.id) ? 'is-complete' : ''}`}>
                  <input type="checkbox" checked={completedTaskIds.includes(task.id)} onChange={() => toggleTask(task.id)} />
                  <span>{task.title}</span>
                </label>
              ))}
            </div>

            <div className="deadline-row">
              <span>近い期限</span>
              <strong>{nearestTaskDeadline}</strong>
            </div>
            <button type="button" className="inline-link" onClick={() => navigate('tasks')}>
              すべて見る <ChevronRight size={12} />
            </button>
          </section>

          <section className="panel mini-panel">
            <div className="panel-header compact-header">
              <div className="panel-title-wrap">
                <span className="icon-badge icon-amber"><FolderKanban size={16} /></span>
                <div>
                  <h2>進行中のプロジェクト</h2>
                  <small>現在の工程</small>
                </div>
              </div>
            </div>
            <div className="project-box">
              <div className="project-headline">
                <strong>ポータルサイト開発</strong>
                <span>③ 画面設計</span>
              </div>
              <p>進行中 ・ 次にやること: データ設計</p>
            </div>
            <button type="button" className="inline-link" onClick={() => navigate('projects')}>
              プロジェクトを開く <ChevronRight size={12} />
            </button>
          </section>
        </aside>
      </div>

      <section className="panel full-width-panel">
        <div className="panel-header">
          <div className="panel-title-wrap">
            <span className="icon-badge icon-slate"><Link2 size={16} /></span>
            <div>
              <h2>よく使う</h2>
              <small>必要なページへすぐに</small>
            </div>
          </div>
        </div>

        <div className="quick-links-grid">
          {homeShortcuts.map((link) => (
            link.route ? (
              <button key={link.name} type="button" className="quick-link-card" onClick={() => navigate(link.route!)}>
                <span className={`link-mark mark-${link.tone}`}>{link.mark}</span>
                <span>{link.name}</span>
                <ChevronRight size={12} />
              </button>
            ) : (
              <a key={link.name} href={link.href} target="_blank" rel="noreferrer" className="quick-link-card">
                <span className={`link-mark mark-${link.tone}`}>{link.mark}</span>
                <span>{link.name}</span>
                <ExternalLink size={12} />
              </a>
            )
          ))}
        </div>

        {!isShortcutFormOpen ? (
          <button type="button" className="button home-add-shortcut" onClick={() => setIsShortcutFormOpen(true)}>
            <Plus size={14} /> よく使うものを追加
          </button>
        ) : (
          <form className="home-shortcut-form" onSubmit={addHomeShortcut}>
            <label>
              名前
              <input type="text" value={shortcutName} onChange={(event) => setShortcutName(event.target.value)} placeholder="例: バイト" required />
            </label>
            <label>
              URL
              <input type="url" value={shortcutUrl} onChange={(event) => setShortcutUrl(event.target.value)} placeholder="https://example.com" required />
            </label>
            <label>
              アイコン文字
              <input type="text" value={shortcutMark} onChange={(event) => setShortcutMark(event.target.value)} placeholder="名前から自動設定" maxLength={2} />
            </label>
            <label>
              カテゴリ
              <select value={shortcutCategory} onChange={(event) => setShortcutCategory(event.target.value as keyof typeof shortcutToneByCategory)}>
                {Object.keys(shortcutToneByCategory).map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
            <div className="home-shortcut-form-actions">
              <button type="button" className="button button-small" onClick={() => setIsShortcutFormOpen(false)}>キャンセル</button>
              <button type="submit" className="button button-primary button-small">追加する</button>
            </div>
          </form>
        )}
      </section>

      <section className="panel full-width-panel note-panel">
        <div className="panel-header">
          <div className="panel-title-wrap">
            <span className="icon-badge icon-amber"><Check size={16} /></span>
            <div>
              <h2>メモ</h2>
              <small>今日の気持ちと忘れ物</small>
            </div>
          </div>
          <span className="save-indicator">{noteSaved ? '保存済み' : '未保存'}</span>
        </div>

        <div className="note-editor">
          <textarea
            value={freeNote}
            onChange={(event) => setFreeNote(event.target.value)}
            placeholder="今日の重要メモをここに書いておくと、すぐに見返せます。"
          />
        </div>
      </section>
    </section>
  );

  const renderCalendar = () => (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">CALENDAR</p>
          <h1>予定を確認する</h1>
        </div>
        <div className="button-row calendar-page-actions">
          <button type="button" className="button button-small" onClick={selectTodayInCalendar}>今日</button>
          <button type="button" className="button button-primary button-small" onClick={openCreateEvent}>
            <Plus size={14} /> 予定を追加
          </button>
        </div>
      </div>

      <div className="calendar-layout">
        <section className="panel page-panel">
          <div className="panel-header">
            <div className="panel-title-wrap">
              <span className="icon-badge icon-blue"><CalendarDays size={16} /></span>
              <div>
                <h2>{new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long' }).format(visibleCalendarMonth)}</h2>
                <small>{selectedCalendarDateLabel}の予定</small>
              </div>
            </div>
            <div className="month-actions">
              <button className="calendar-arrow" type="button" aria-label="前月" onClick={() => changeCalendarMonth(-1)}>‹</button>
              <button className="calendar-arrow" type="button" aria-label="次月" onClick={() => changeCalendarMonth(1)}>›</button>
            </div>
          </div>

          <div className="calendar-weekdays">
            {['日', '月', '火', '水', '木', '金', '土'].map((day) => <span key={day}>{day}</span>)}
          </div>

          <div className="month-grid">
            {Array.from({ length: calendarCellCount }, (_, index) => index - calendarStartOffset + 1).map((day, index) => {
              if (day < 1 || day > calendarDaysInMonth) {
                return <span key={`empty-${index}`} className="day-cell-empty" aria-hidden="true" />;
              }

              const date = new Date(calendarYear, calendarMonthIndex, day);
              const dateKey = toLocalDateKey(date);
              const isSelected = dateKey === toLocalDateKey(selectedCalendarDate);
              const dayOfWeek = date.getDay();
              const hasEvents = events.some((event) => event.date === dateKey)
                || (dayOfWeek >= 1 && dayOfWeek <= 5 && timetable.some((t) => t.day === dayJaList[dayOfWeek]));
              const isToday = dateKey === toLocalDateKey(today);

              return (
                <button
                  key={day}
                  type="button"
                  aria-label={`${day}日${hasEvents ? ' 予定あり' : ''}`}
                  aria-pressed={isSelected}
                  className={`day-cell ${isSelected ? 'selected' : ''} ${hasEvents ? 'has-dot' : ''} ${isToday ? 'is-today' : ''}`}
                  onClick={() => {
                    setSelectedCalendarDate(date);
                    setSelectedEventId(null);
                    setEventDialogMode(null);
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="panel page-panel">
          <div className="panel-header compact-header">
            <div className="panel-title-wrap">
              <span className="icon-badge icon-teal"><Clock3 size={16} /></span>
              <div>
                <h2>{selectedCalendarDateLabel}</h2>
                <small>選択した日の予定</small>
              </div>
            </div>
            <span className="tiny-badge">{selectedDaySchedule.length}件</span>
          </div>

          <div className="agenda-list">
            {selectedDaySchedule.map((item) => (
              <div key={item.id} className="agenda-row event-agenda-row">
                <time>{item.startTime}</time>
                <span className={`agenda-bar ${item.tone}`} />
                <button type="button" className="event-agenda-summary" onClick={() => openMergedScheduleEntry(item)}>
                  <strong>{item.title}</strong>
                  <small>{item.endTime} ・ {item.categoryOrType} ・ {item.formatOrDesc}{item.location ? ` ・ ${item.location}` : ''}</small>
                </button>
                <button type="button" className="button button-small" onClick={() => openMergedScheduleEntry(item)}>詳細</button>
              </div>
            ))}
            {selectedDaySchedule.length === 0 && <p className="calendar-empty-state">この日の予定はありません。</p>}
          </div>
        </aside>
      </div>

      {eventDialogMode && (
        <div className="event-dialog-backdrop">
          <section className="event-dialog" role="dialog" aria-modal="true" aria-labelledby="event-dialog-title">
            <button type="button" className="event-dialog-close" aria-label="閉じる" onClick={() => setEventDialogMode(null)}>
              <X size={18} />
            </button>

            {eventDialogMode === 'form' && (
              <form onSubmit={saveEvent}>
                <header className="event-dialog-header">
                  <p className="eyebrow">{editingEventId ? 'EDIT EVENT' : 'NEW EVENT'}</p>
                  <h2 id="event-dialog-title">{editingEventId ? '予定を編集' : '予定を追加'}</h2>
                </header>
                <div className="event-form-grid">
                  <label className="event-field event-field-date">
                    日付
                    <input type="date" required value={eventDraft.date} onChange={(change) => setEventDraft((current) => ({ ...current, date: change.target.value }))} />
                  </label>
                  <label className="event-field">
                    開始
                    <input type="time" required value={eventDraft.startTime} onChange={(change) => setEventDraft((current) => ({ ...current, startTime: change.target.value }))} />
                  </label>
                  <label className="event-field">
                    終了
                    <input type="time" required value={eventDraft.endTime} onChange={(change) => setEventDraft((current) => ({ ...current, endTime: change.target.value }))} />
                  </label>
                  <label className="event-field event-field-wide">
                    予定名
                    <input type="text" required maxLength={80} autoFocus value={eventDraft.title} onChange={(change) => setEventDraft((current) => ({ ...current, title: change.target.value }))} placeholder="例: Webアプリ開発" />
                  </label>
                  <label className="event-field">
                    カテゴリ
                    <select value={eventDraft.category} onChange={(change) => setEventDraft((current) => ({ ...current, category: change.target.value as EventCategory }))}>
                      {eventCategories.map((category) => <option key={category}>{category}</option>)}
                    </select>
                  </label>
                  <label className="event-field">
                    形式
                    <select value={eventDraft.format} onChange={(change) => setEventDraft((current) => ({ ...current, format: change.target.value as EventFormat }))}>
                      {eventFormats.map((format) => <option key={format}>{format}</option>)}
                    </select>
                  </label>
                  <label className="event-field event-field-wide">
                    場所
                    <input type="text" maxLength={100} value={eventDraft.location} onChange={(change) => setEventDraft((current) => ({ ...current, location: change.target.value }))} placeholder="教室・オンラインURL名など" />
                  </label>
                </div>
                {eventFormError && <p className="event-form-error" role="alert">{eventFormError}</p>}
                <div className="event-dialog-actions">
                  <button type="button" className="button" onClick={() => setEventDialogMode(editingEventId ? 'detail' : null)}>キャンセル</button>
                  <button type="submit" className="button button-primary">保存</button>
                </div>
              </form>
            )}

            {eventDialogMode === 'detail' && selectedEvent && (
              <div>
                <header className="event-dialog-header">
                  <p className="eyebrow">EVENT DETAILS</p>
                  <h2 id="event-dialog-title">{selectedEvent.title}</h2>
                </header>
                <dl className="event-detail-list">
                  <div><dt>日時</dt><dd>{formatToday(new Date(`${selectedEvent.date}T00:00:00`))} ・ {selectedEvent.startTime}〜{selectedEvent.endTime}</dd></div>
                  <div><dt>カテゴリ</dt><dd>{selectedEvent.category}</dd></div>
                  <div><dt>形式</dt><dd>{selectedEvent.format}</dd></div>
                  <div><dt>場所</dt><dd>{selectedEvent.location || '未設定'}</dd></div>
                </dl>
                <div className="event-dialog-actions event-detail-actions">
                  <button type="button" className="button button-danger" onClick={() => setEventDialogMode('delete')}>
                    <Trash2 size={15} /> 削除
                  </button>
                  <button type="button" className="button button-primary" onClick={() => openEditEvent(selectedEvent)}>
                    <Pencil size={15} /> 編集
                  </button>
                </div>
              </div>
            )}

            {eventDialogMode === 'delete' && selectedEvent && (
              <div>
                <header className="event-dialog-header">
                  <p className="eyebrow">DELETE EVENT</p>
                  <h2 id="event-dialog-title">予定を削除しますか？</h2>
                  <p className="event-delete-copy">「{selectedEvent.title}」を削除すると、HomeとCalendarの両方から表示されなくなります。</p>
                </header>
                <div className="event-dialog-actions">
                  <button type="button" className="button" onClick={() => setEventDialogMode('detail')}>戻る</button>
                  <button type="button" className="button button-danger" onClick={deleteSelectedEvent}>削除する</button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );

  const renderTimetableDialog = () => {
    if (!timetableDialogMode) return null;

    return (
      <div className="event-dialog-backdrop">
        <section className="event-dialog" role="dialog" aria-modal="true" aria-labelledby="timetable-dialog-title">
          <button
            type="button"
            className="event-dialog-close"
            aria-label="閉じる"
            onClick={() => setTimetableDialogMode(null)}
          >
            <X size={18} />
          </button>

          {timetableDialogMode === 'form' && (
            <form onSubmit={saveTimetableItem}>
              <header className="event-dialog-header">
                <p className="eyebrow">{editingTimetableId ? 'EDIT CLASS' : 'REGISTER CLASS'}</p>
                <h2 id="timetable-dialog-title">
                  {timetableDraft.day}曜日 {timetableDraft.period}限の授業を{editingTimetableId ? '編集' : '登録'}
                </h2>
              </header>

              <div className="event-form-grid">
                <label className="event-field event-field-wide">
                  科目名
                  <input
                    type="text"
                    required
                    maxLength={60}
                    autoFocus
                    placeholder="例: データベース、Webアプリ開発"
                    value={timetableDraft.subject}
                    onChange={(e) => setTimetableDraft((prev) => ({ ...prev, subject: e.target.value }))}
                  />
                </label>

                <div className="event-field event-field-wide">
                  <span>授業形式（受講スタイル）</span>
                  <div className="class-type-selector-grid">
                    {[
                      { type: 'in_person' as ClassType, label: '登校（対面）', desc: '教室で受講' },
                      { type: 'zoom' as ClassType, label: 'オンライン（Zoom）', desc: '配信・リアルタイム' },
                      { type: 'ondemand' as ClassType, label: 'オンデマンド', desc: '録画・自習' },
                      { type: 'other' as ClassType, label: 'その他', desc: '集中講義等' },
                    ].map((opt) => (
                      <button
                        key={opt.type}
                        type="button"
                        className={`class-type-select-btn ${timetableDraft.classType === opt.type ? 'is-selected ' + classTypeConfig[opt.type].className : ''}`}
                        onClick={() => setTimetableDraft((prev) => ({ ...prev, classType: opt.type }))}
                      >
                        <strong>{opt.label}</strong>
                        <small>{opt.desc}</small>
                      </button>
                    ))}
                  </div>
                </div>

                <label className="event-field">
                  開始時間
                  <input
                    type="time"
                    required
                    value={timetableDraft.startTime}
                    onChange={(e) => setTimetableDraft((prev) => ({ ...prev, startTime: e.target.value }))}
                  />
                </label>

                <label className="event-field">
                  終了時間
                  <input
                    type="time"
                    required
                    value={timetableDraft.endTime}
                    onChange={(e) => setTimetableDraft((prev) => ({ ...prev, endTime: e.target.value }))}
                  />
                </label>

                <label className="event-field event-field-wide">
                  教室 / Zoom・講義リンク / メモ
                  <input
                    type="text"
                    maxLength={140}
                    placeholder={
                      timetableDraft.classType === 'zoom'
                        ? '例: https://zoom.us/j/... またはミーティングID'
                        : timetableDraft.classType === 'ondemand'
                        ? '例: https://classroom.google.com/ ... または講義ポータル'
                        : '例: 302教室、第2講堂など'
                    }
                    value={timetableDraft.classroom}
                    onChange={(e) => setTimetableDraft((prev) => ({ ...prev, classroom: e.target.value }))}
                  />
                </label>
              </div>

              {timetableFormError && <p className="event-form-error" role="alert">{timetableFormError}</p>}

              <div className="event-dialog-actions">
                <button
                  type="button"
                  className="button"
                  onClick={() => setTimetableDialogMode(editingTimetableId ? 'detail' : null)}
                >
                  キャンセル
                </button>
                <button type="submit" className="button button-primary">
                  保存する
                </button>
              </div>
            </form>
          )}

          {timetableDialogMode === 'detail' && selectedTimetableItem && (
            <div>
              <header className="event-dialog-header">
                <p className="eyebrow">CLASS DETAILS</p>
                <h2 id="timetable-dialog-title">{selectedTimetableItem.subject}</h2>
              </header>
              <dl className="event-detail-list">
                <div>
                  <dt>曜日・時限</dt>
                  <dd>{selectedTimetableItem.day}曜日 {selectedTimetableItem.period}限</dd>
                </div>
                <div>
                  <dt>時間</dt>
                  <dd>{selectedTimetableItem.startTime} 〜 {selectedTimetableItem.endTime}</dd>
                </div>
                <div>
                  <dt>授業形式</dt>
                  <dd>
                    <span className={`class-type-badge ${classTypeConfig[selectedTimetableItem.classType]?.className || ''}`}>
                      {classTypeConfig[selectedTimetableItem.classType]?.label}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>教室 / リンク</dt>
                  <dd>
                    {selectedTimetableItem.classroom ? (
                      /^https?:\/\//i.test(selectedTimetableItem.classroom) ? (
                        <a href={selectedTimetableItem.classroom} target="_blank" rel="noreferrer" className="inline-link-button">
                          リンクを開く <ExternalLink size={13} />
                        </a>
                      ) : (
                        selectedTimetableItem.classroom
                      )
                    ) : (
                      '未設定'
                    )}
                  </dd>
                </div>
              </dl>
              <div className="event-dialog-actions event-detail-actions">
                <button type="button" className="button button-danger" onClick={() => setTimetableDialogMode('delete')}>
                  <Trash2 size={15} /> 削除
                </button>
                <button type="button" className="button button-primary" onClick={() => openEditTimetable(selectedTimetableItem)}>
                  <Pencil size={15} /> 編集
                </button>
              </div>
            </div>
          )}

          {timetableDialogMode === 'delete' && selectedTimetableItem && (
            <div>
              <header className="event-dialog-header">
                <p className="eyebrow">DELETE CLASS</p>
                <h2 id="timetable-dialog-title">授業を削除しますか？</h2>
                <p className="event-delete-copy">
                  「{selectedTimetableItem.day}曜日 {selectedTimetableItem.period}限 {selectedTimetableItem.subject}」を時間割から削除します。
                </p>
              </header>
              <div className="event-dialog-actions">
                <button type="button" className="button" onClick={() => setTimetableDialogMode('detail')}>
                  戻る
                </button>
                <button type="button" className="button button-danger" onClick={deleteSelectedTimetableItem}>
                  削除する
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    );
  };

  const renderTimetable = () => {
    const timetableCount = timetable.length;
    const inPersonCount = timetable.filter((t) => t.classType === 'in_person').length;
    const zoomCount = timetable.filter((t) => t.classType === 'zoom').length;
    const ondemandCount = timetable.filter((t) => t.classType === 'ondemand').length;

    return (
      <section className="page">
        <div className="page-header">
          <div>
            <p className="eyebrow">TIMETABLE</p>
            <h1>時間割</h1>
          </div>
          <button className="button button-primary button-small" type="button" onClick={() => navigate('subject')}>
            科目を見る
          </button>
        </div>

        <div className="school-layout">
          <section className="panel page-panel">
            <div className="panel-header">
              <div className="panel-title-wrap">
                <span className="icon-badge icon-blue"><BookOpen size={16} /></span>
                <div>
                  <h2>週間の時間割</h2>
                  <small>月〜金 ・ 1〜5限</small>
                </div>
              </div>
              <div className="school-week-navigation" aria-label="時間割の情報">
                <span className="tiny-badge">登録: {timetableCount}コマ</span>
              </div>
            </div>

            <div className="timetable-scroll" role="region" aria-label="週間の時間割" tabIndex={0}>
              <div className="timetable">
                <div className="timetable-head">時限</div>
                {timetableDays.map((day) => {
                  const isCurrentDay = dayJaList[today.getDay()] === day;
                  return (
                    <div key={day} className={`timetable-head school-day-header ${isCurrentDay ? 'is-today' : ''}`}>
                      <span>{day}曜日</span>
                      <small>{isCurrentDay ? '（今日）' : ''}</small>
                    </div>
                  );
                })}

                {schoolPeriods.map((period) => (
                  <Fragment key={period.period}>
                    <div className="timetable-cell period">
                      <strong>{period.period}限</strong>
                      <small>{period.startTime}</small>
                    </div>
                    {timetableDays.map((day) => {
                      const item = timetable.find((t) => t.day === day && t.period === period.period);
                      return (
                        <div key={`${day}-${period.period}`} className="timetable-cell school-time-cell">
                          {item ? (
                            <button
                              type="button"
                              className={`class-pill class-pill-filled ${classTypeConfig[item.classType]?.className || ''}`}
                              onClick={() => openTimetableDetail(item)}
                            >
                              <div className="class-pill-header">
                                <strong className="class-pill-subject">{item.subject}</strong>
                                <span className="class-type-badge">{classTypeConfig[item.classType]?.shortLabel}</span>
                              </div>
                              <div className="class-pill-footer">
                                <span className="class-pill-time">{item.startTime}〜{item.endTime}</span>
                                {item.classroom && <span className="class-pill-room">{item.classroom}</span>}
                              </div>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="class-pill class-pill-empty"
                              aria-label={`${day}曜日 ${period.period}限に授業を登録`}
                              onClick={() => openCreateTimetable(day, period.period)}
                            >
                              <span aria-hidden="true">＋</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          </section>

          <aside className="panel page-panel">
            <div className="panel-header compact-header">
              <div className="panel-title-wrap">
                <span className="icon-badge icon-violet"><NotebookPen size={16} /></span>
                <div>
                  <h2>時間割の状況</h2>
                  <small>授業形式の内訳</small>
                </div>
              </div>
            </div>

            <div className="info-stack">
              <div className="info-row">
                <span>登録授業数</span>
                <strong>{timetableCount}コマ</strong>
              </div>
              <div className="info-row">
                <span>🏫 登校（対面）</span>
                <strong>{inPersonCount}コマ</strong>
              </div>
              <div className="info-row">
                <span>💻 オンライン（Zoom）</span>
                <strong>{zoomCount}コマ</strong>
              </div>
              <div className="info-row">
                <span>📹 オンデマンド</span>
                <strong>{ondemandCount}コマ</strong>
              </div>
              <div className="info-row">
                <span>次の課題</span>
                <strong>DB課題提出</strong>
              </div>
              <div className="info-row">
                <span>次のテスト</span>
                <strong>10/15 データベース</strong>
              </div>
            </div>
          </aside>
        </div>
      </section>
    );
  };

  const renderSubject = () => (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">SUBJECT</p>
          <h1>Webアプリ開発</h1>
        </div>
        <div className="button-row">
          <a className="button button-primary" href="https://zoom.us/" target="_blank" rel="noreferrer">Zoomを開く</a>
          <a className="button" href="https://classroom.google.com/" target="_blank" rel="noreferrer">資料を見る</a>
        </div>
      </div>

      <div className="subject-meta-grid">
        <div className="meta-pill"><span>授業形式</span><strong>対面</strong></div>
        <div className="meta-pill"><span>時間</span><strong>09:10 - 10:40</strong></div>
        <div className="meta-pill"><span>教室</span><strong>302教室</strong></div>
        <div className="meta-pill"><span>出席</span><strong>12 / 14</strong></div>
      </div>

      <div className="tab-row">
        {lessonTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-button ${activeLessonTab === tab.id ? 'is-active' : ''}`}
            onClick={() => setActiveLessonTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="subject-layout">
        <section className="panel page-panel">
          <div className="panel-header compact-header">
            <div className="panel-title-wrap">
              <span className="icon-badge icon-blue"><NotebookPen size={16} /></span>
              <div>
                <h2>{lesson.heading}</h2>
                <small>{lesson.date}</small>
              </div>
            </div>
          </div>

          <div className="note-box">
            <ul className="note-list">
              {lesson.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="info-stack small-stack">
            <div className="info-row">
              <span>前回</span>
              <strong>Reactのコンポーネント設計</strong>
            </div>
            <div className="info-row">
              <span>今回</span>
              <strong>{lesson.heading}</strong>
            </div>
            <div className="info-row">
              <span>次回</span>
              <strong>Firebaseとの連携</strong>
            </div>
          </div>

          <div className="subject-next-task">
            <div>
              <strong>次回までにやること</strong>
              <span>{subjectFollowUpTask.title}</span>
              <small>期限 {subjectFollowUpTask.deadline}</small>
            </div>
            <button
              type="button"
              className={`button button-small ${subjectTaskAdded ? '' : 'button-primary'}`}
              onClick={addSubjectFollowUpTask}
              disabled={subjectTaskAdded}
            >
              {subjectTaskAdded ? 'Tasksに追加済み' : 'Taskに追加'}
            </button>
          </div>
        </section>

        <aside className="stacked-side">
          <section className="panel mini-panel">
            <div className="panel-header compact-header">
              <div className="panel-title-wrap">
                <span className="icon-badge icon-violet"><ListTodo size={16} /></span>
                <div>
                  <h2>関連課題</h2>
                  <small>提出物</small>
                </div>
              </div>
            </div>
            {tasks.filter((task) => task.context.includes('Webアプリ開発')).map((task) => (
              <div key={task.id} className="relationship-card">
                <strong>{task.title}</strong>
                <span>期限 {task.deadline}</span>
              </div>
            ))}
            <button type="button" className="inline-link" onClick={() => navigate('tasks')}>
              Tasks一覧を見る <ChevronRight size={12} />
            </button>
          </section>

          <section className="panel mini-panel">
            <div className="panel-header compact-header">
              <div className="panel-title-wrap">
                <span className="icon-badge icon-amber"><BookOpen size={16} /></span>
                <div>
                  <h2>関連テスト</h2>
                  <small>確認事項</small>
                </div>
              </div>
            </div>
            <div className="relationship-card">
              <strong>データベース確認</strong>
              <span>10/15</span>
            </div>
            <div className="relationship-card">
              <strong>JavaScript基礎</strong>
              <span>10/20</span>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );

  const renderTasks = () => (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">TASKS</p>
          <h1>やることを整理する</h1>
        </div>
      </div>

      <div className="task-layout">
        <section className="panel page-panel">
          <div className="panel-header task-panel-header">
            <div className="panel-title-wrap">
              <span className="icon-badge icon-violet"><ListTodo size={16} /></span>
              <div>
                <h2>タスク一覧</h2>
                <small>期限と関連先で整理</small>
              </div>
            </div>
            <div className="task-filter-row" role="group" aria-label="タスクの表示">
              <button type="button" className={`task-filter ${taskFilter === 'all' ? 'is-active' : ''}`} aria-pressed={taskFilter === 'all'} onClick={() => setTaskFilter('all')}>
                すべて {tasks.length}
              </button>
              <button type="button" className={`task-filter ${taskFilter === 'open' ? 'is-active' : ''}`} aria-pressed={taskFilter === 'open'} onClick={() => setTaskFilter('open')}>
                未完了 {tasks.length - completedTaskCount}
              </button>
              <button type="button" className={`task-filter ${taskFilter === 'done' ? 'is-active' : ''}`} aria-pressed={taskFilter === 'done'} onClick={() => setTaskFilter('done')}>
                完了 {completedTaskCount}
              </button>
            </div>
          </div>

          <div className="task-list">
            {visibleTasks.map((task) => (
              <label key={task.id} className={`task-item ${completedTaskIds.includes(task.id) ? 'is-complete' : ''}`}>
                <input type="checkbox" checked={completedTaskIds.includes(task.id)} onChange={() => toggleTask(task.id)} />
                <div className="task-copy">
                  <strong>{task.title}</strong>
                  <span>{task.context}</span>
                </div>
                <span className="due-pill">{task.deadline}</span>
              </label>
            ))}
            {visibleTasks.length === 0 && <p className="calendar-empty-state">この状態のタスクはありません。</p>}
          </div>
        </section>

        <aside className="panel page-panel">
          <div className="panel-header compact-header">
            <div className="panel-title-wrap">
              <span className="icon-badge icon-blue"><CalendarDays size={16} /></span>
              <div>
                <h2>予定との違い</h2>
                <small>区別して確認</small>
              </div>
            </div>
          </div>

          <div className="info-stack">
            <div className="info-row">
              <span>予定</span>
              <strong>その時間に発生するもの</strong>
            </div>
            <div className="info-row">
              <span>タスク</span>
              <strong>自分が完了する必要があるもの</strong>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );

  const renderProjects = () => (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">PROJECTS</p>
          <h1>プロジェクトを確認する</h1>
        </div>
      </div>

      <div className="project-grid">
        {demoProjects.map((project) => (
          <article key={project.name} className="panel page-panel project-card">
            <div className="panel-header compact-header">
              <div className="panel-title-wrap">
                <span className="icon-badge icon-blue"><FolderKanban size={16} /></span>
                <div>
                  <h2>{project.name}</h2>
                  <small>{project.status}</small>
                </div>
              </div>
              <span className="tiny-badge">{project.completedStages}/{project.stages.length}工程</span>
            </div>

            <div className="project-stage-summary">
              <span>現在の工程</span>
              <strong>{project.stages[project.completedStages]}</strong>
            </div>

            <ol className="project-stage-list">
              {project.stages.map((stage, index) => {
                const isComplete = index < project.completedStages;
                const isCurrent = index === project.completedStages;
                return (
                  <li key={stage} className={`project-stage ${isComplete ? 'is-complete' : ''} ${isCurrent ? 'is-current' : ''}`}>
                    <span className="project-stage-marker">{isComplete ? '✓' : index + 1}</span>
                    <span>{stage}</span>
                    <small>{isComplete ? '完了' : isCurrent ? '進行中' : '未着手'}</small>
                  </li>
                );
              })}
            </ol>

            <div className="project-next-step">
              <span>次にやること</span>
              <strong>{project.nextAction}</strong>
            </div>

            <div className="project-card-meta">
              <span>期限</span>
              <strong>{project.deadline}</strong>
              <button type="button" className="inline-link" onClick={() => navigate('tasks')}>
                関連Taskを見る <ChevronRight size={12} />
              </button>
            </div>

            <details className="project-history">
              <summary>最近の進捗記録 {project.history.length}件</summary>
              <ul>
                {project.history.map((entry) => <li key={entry}>{entry}</li>)}
              </ul>
            </details>

            {project.name === 'グループ開発' && (
              <details className="project-ai-proposal">
                <summary>AIの進捗整理案を見る <span>画面イメージ</span></summary>
                <p>設計確認を進めている段階と整理しました。内容を確認してからProjectの進捗に反映します。</p>
              </details>
            )}
          </article>
        ))}
      </div>
    </section>
  );

  const renderWork = () => (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">WORK</p>
          <h1>バイトの予定を確認する</h1>
        </div>
      </div>

      <div className="work-layout">
        <section className="panel page-panel">
          <div className="panel-header compact-header">
            <div className="panel-title-wrap">
              <span className="icon-badge icon-teal"><BriefcaseBusiness size={16} /></span>
              <div>
                <h2>今週のシフト</h2>
                <small>マック ・ 時給 ¥{hourlyRate.toLocaleString('ja-JP')}</small>
              </div>
            </div>
            <span className="tiny-badge">{demoShifts.length}件</span>
          </div>

          <div className="agenda-list">
            {demoShifts.map((shift) => {
              const workMinutes = getShiftWorkMinutes(shift);
              const shiftPay = Math.round((workMinutes * hourlyRate) / 60);
              return (
                <div key={`${shift.day}-${shift.start}`} className="agenda-row">
                  <time>{shift.day}</time>
                  <span className="agenda-bar work" />
                  <div>
                    <strong>{shift.start} - {shift.end}</strong>
                    <small>{shift.breakMinutes === 0 ? '休憩なし' : `休憩 ${shift.breakMinutes}分`}</small>
                  </div>
                  <span className="shift-result">
                    <small>実働 {workMinutes / 60}h</small>
                    <strong>¥{shiftPay.toLocaleString('ja-JP')}</strong>
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="panel page-panel">
          <div className="panel-header compact-header">
            <div className="panel-title-wrap">
              <span className="icon-badge icon-violet"><Wallet size={16} /></span>
              <div>
                <h2>今週の給与見込み</h2>
                <small>実働 × 時給</small>
              </div>
            </div>
          </div>
          <div className="info-stack">
            <div className="info-row">
              <span>時給</span>
              <strong>¥{hourlyRate.toLocaleString('ja-JP')}</strong>
            </div>
            <div className="info-row">
              <span>休憩後の実働</span>
              <strong>{plannedWorkMinutes / 60}時間</strong>
            </div>
            <div className="info-row">
              <span>予定給与</span>
              <strong>¥{plannedWorkPay.toLocaleString('ja-JP')}</strong>
            </div>
          </div>
          <button type="button" className="inline-link" onClick={() => navigate('finance')}>
            Financeを見る <ChevronRight size={12} />
          </button>
        </aside>
      </div>
    </section>
  );

  const renderFinance = () => (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">FINANCE</p>
          <h1>収支を確認する</h1>
        </div>
        {!isExpenseFormOpen && (
          <button className="button button-primary button-small" type="button" onClick={() => setIsExpenseFormOpen(true)}>
            <Plus size={14} /> 支出を追加
          </button>
        )}
      </div>

      {isExpenseFormOpen && (
        <form className="panel finance-entry-form" onSubmit={submitExpense}>
          <div className="panel-header compact-header">
            <div>
              <h2>支出を記録</h2>
              <small>登録内容はこのプレビュー内だけに反映されます</small>
            </div>
          </div>

          <div className="finance-entry-fields">
            <label className="finance-field">
              内容
              <input
                type="text"
                required
                value={expenseName}
                onChange={(event) => {
                  setExpenseName(event.target.value);
                  setExpenseCategory(suggestExpenseCategory(event.target.value));
                }}
                placeholder="例: 自販機"
              />
            </label>
            <label className="finance-field">
              金額
              <input
                type="number"
                min="1"
                step="1"
                required
                value={expenseAmount}
                onChange={(event) => setExpenseAmount(event.target.value)}
                placeholder="150"
              />
            </label>
            <label className="finance-field">
              カテゴリ
              <select value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value)}>
                {financeCategories.map((category) => <option key={category}>{category}</option>)}
              </select>
              <small>入力からの候補: {suggestExpenseCategory(expenseName)}</small>
            </label>
          </div>

          <div className="finance-form-actions">
            <span>日付: {formatToday(today)}</span>
            <div>
              <button className="button button-small" type="button" onClick={() => setIsExpenseFormOpen(false)}>キャンセル</button>
              <button className="button button-primary button-small" type="submit">登録</button>
            </div>
          </div>
        </form>
      )}

      <div className="finance-layout">
        <section className="panel page-panel">
          <div className="panel-header compact-header">
            <div className="panel-title-wrap">
              <span className="icon-badge icon-violet"><Wallet size={16} /></span>
              <div>
                <h2>今月の収支</h2>
                <small>支出と残高</small>
              </div>
            </div>
            <span className="tiny-badge">{today.getMonth() + 1}月</span>
          </div>

          <div className="rate-stack">
            <div className="rate-row">
              <span>収入</span>
              <strong className="positive">¥{monthlyIncome.toLocaleString('ja-JP')}</strong>
            </div>
            <div className="rate-row">
              <span>支出</span>
              <strong className="negative">¥{monthlyExpenses.toLocaleString('ja-JP')}</strong>
            </div>
            <div className="rate-row tall-row">
              <span>残高</span>
              <strong>¥{monthlyBalance.toLocaleString('ja-JP')}</strong>
            </div>
            <div className="rate-row">
              <span>Workの今週の給与見込み</span>
              <strong>¥{plannedWorkPay.toLocaleString('ja-JP')} ・予定</strong>
            </div>
          </div>
        </section>

        <aside className="panel page-panel">
          <div className="panel-header compact-header">
            <div className="panel-title-wrap">
              <span className="icon-badge icon-amber"><BookOpen size={16} /></span>
              <div>
                <h2>最近の支出</h2>
                <small>今月の記録</small>
              </div>
            </div>
          </div>

          <div className="expense-list">
            {expenses.map((expense) => (
              <div key={expense.id} className="expense-row">
                <div className="expense-detail">
                  <span>{expense.name}</span>
                  <small>{expense.date} ・ {expense.category}</small>
                </div>
                <strong>¥{expense.amount.toLocaleString('ja-JP')}</strong>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );

  const renderLinks = () => (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">LINKS</p>
          <h1>よく使うアプリ</h1>
        </div>
      </div>

      <div className="links-grid">
        {quickLinks.map((link) => (
          <a key={link.name} href={link.href} target="_blank" rel="noreferrer" className="link-card">
            <span className={`link-badge badge-${link.tone}`}>{link.mark}</span>
            <strong>{link.name}</strong>
            <small>{link.kind}</small>
          </a>
        ))}
      </div>
    </section>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'calendar':
        return renderCalendar();
      case 'timetable':
        return renderTimetable();
      case 'subject':
        return renderSubject();
      case 'tasks':
        return renderTasks();
      case 'projects':
        return renderProjects();
      case 'work':
        return renderWork();
      case 'finance':
        return renderFinance();
      case 'links':
        return renderLinks();
      case 'home':
      default:
        return renderHome();
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="メインメニュー">
        <div className="brand">
          <span className="brand-mark"><House size={18} /></span>
          <div>
            <span className="brand-name">Life OS</span>
            <span className="brand-caption">統合版 ・ UI試作</span>
          </div>
        </div>

        <p className="nav-label">PERSONAL WORKSPACE</p>
        <nav className="nav-list" aria-label="ナビゲーション">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" className={`nav-item ${activeView === item.id ? 'is-active' : ''}`} onClick={() => navigate(item.id)}>
                <Icon size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-note">
          <span className="sidebar-note-icon"><CheckCircle2 size={15} /></span>
          <p>今日の状況から、必要な情報へ。</p>
        </div>

        <div className="profile-row">
          <span className="profile-avatar">太</span>
          <div className="profile-copy">
            <strong>太郎さん</strong>
            <small>学生</small>
          </div>
          <button className="profile-help" type="button" aria-label="ヘルプ">
            <CheckCircle2 size={15} />
          </button>
        </div>
      </aside>

      <div className="main-area">
        {renderTopBar(activeView === 'home' ? 'ホーム' : navItems.find((item) => item.id === activeView)?.label ?? 'ホーム')}
        <main className="content-area">{renderContent()}</main>
        {renderTimetableDialog()}
      </div>

      <div className={`mobile-more-menu ${isMobileMoreOpen ? 'is-open' : ''}`} id="mobile-more-menu" aria-hidden={!isMobileMoreOpen}>
        {navItems.filter((item) => item.id !== 'home' && item.id !== 'calendar' && item.id !== 'tasks').map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} type="button" onClick={() => navigate(item.id)}>
              <Icon size={16} /> {item.label}
            </button>
          );
        })}
      </div>
      <nav className="mobile-bottom-nav" aria-label="モバイルナビゲーション">
        <button type="button" className={activeView === 'home' ? 'is-active' : ''} onClick={() => navigate('home')}>
          <House size={18} /><span>ホーム</span>
        </button>
        <button type="button" className={activeView === 'calendar' ? 'is-active' : ''} onClick={() => navigate('calendar')}>
          <CalendarDays size={18} /><span>カレンダー</span>
        </button>
        <button type="button" className={activeView === 'tasks' ? 'is-active' : ''} onClick={() => navigate('tasks')}>
          <ListTodo size={18} /><span>タスク</span>
        </button>
        <button
          type="button"
          className={isMobileMoreOpen || !['home', 'calendar', 'tasks'].includes(activeView) ? 'is-active' : ''}
          aria-expanded={isMobileMoreOpen}
          aria-controls="mobile-more-menu"
          onClick={() => setIsMobileMoreOpen((open) => !open)}
        >
          <Menu size={18} /><span>その他</span>
        </button>
      </nav>
    </div>
  );
}

export default App;


