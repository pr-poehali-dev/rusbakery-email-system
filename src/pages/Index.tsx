import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

const API_URLS = {
  auth: 'https://functions.poehali.dev/75fa0562-bd6a-44af-9e7c-81134f092025',
  users: 'https://functions.poehali.dev/6d463c95-8038-4a7c-8166-78e386fff6ac',
  messages: 'https://functions.poehali.dev/4629c767-0edf-4bbf-b04b-1768b3d856c1',
};

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  role: 'owner' | 'worker';
  isOnline: boolean;
  lastSeen: string;
}

interface Message {
  id: number;
  fromUserId: number;
  to: number[];
  content: string;
  timestamp: string;
  isBroadcast: boolean;
  attachments?: { name: string; url: string; size: number }[];
}

const Index = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChat, setSelectedChat] = useState<User | null>(null);
  const [messageText, setMessageText] = useState('');
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showBroadcastDialog, setShowBroadcastDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showEmployeesDialog, setShowEmployeesDialog] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  
  const [newUserData, setNewUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  const [broadcastRecipients, setBroadcastRecipients] = useState<number[]>([]);
  const [broadcastMessage, setBroadcastMessage] = useState('');

  const fetchUsers = async () => {
    try {
      const response = await fetch(API_URLS.users);
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchMessages = async () => {
    if (!currentUser) return;
    try {
      const response = await fetch(`${API_URLS.messages}?userId=${currentUser.id}`);
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    
    fetchUsers();
    fetchMessages();
    
    const interval = setInterval(() => {
      fetchUsers();
      fetchMessages();
    }, 2000);

    return () => clearInterval(interval);
  }, [currentUser]);

  const handleLogin = async () => {
    try {
      const response = await fetch(API_URLS.auth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      if (response.ok) {
        const user = await response.json();
        setCurrentUser(user);
        toast.success(`Добро пожаловать, ${user.displayName || user.firstName}!`);
      } else {
        toast.error('Неверный email или пароль');
      }
    } catch (error) {
      toast.error('Ошибка подключения к серверу');
    }
  };

  const handleCreateUser = async () => {
    if (!newUserData.firstName || !newUserData.lastName || !newUserData.email || !newUserData.password) {
      toast.error('Заполните все поля');
      return;
    }

    try {
      const response = await fetch(API_URLS.users, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUserData.email + '@RusBakery',
          password: newUserData.password,
          firstName: newUserData.firstName,
          lastName: newUserData.lastName,
        }),
      });

      if (response.ok) {
        setNewUserData({ firstName: '', lastName: '', email: '', password: '' });
        setShowUserDialog(false);
        toast.success('Пользователь создан');
        fetchUsers();
      } else {
        toast.error('Ошибка создания пользователя');
      }
    } catch (error) {
      toast.error('Ошибка подключения к серверу');
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedChat || !currentUser) return;

    const fileAttachments = await Promise.all(
      attachedFiles.map(async (file) => {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        return {
          name: file.name,
          size: file.size,
          url: base64,
        };
      })
    );

    try {
      const response = await fetch(API_URLS.messages, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromUserId: currentUser.id,
          toUserIds: [selectedChat.id],
          content: messageText,
          isBroadcast: false,
          attachments: fileAttachments.length > 0 ? fileAttachments : undefined,
        }),
      });

      if (response.ok) {
        setMessageText('');
        setAttachedFiles([]);
        toast.success('Сообщение отправлено');
        fetchMessages();
      } else {
        toast.error('Ошибка отправки сообщения');
      }
    } catch (error) {
      toast.error('Ошибка подключения к серверу');
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim() || !currentUser) {
      toast.error('Введите текст сообщения');
      return;
    }

    const recipients = broadcastRecipients.length > 0 
      ? broadcastRecipients 
      : users.filter(u => u.id !== currentUser?.id).map(u => u.id);

    try {
      const response = await fetch(API_URLS.messages, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromUserId: currentUser.id,
          toUserIds: recipients,
          content: broadcastMessage,
          isBroadcast: true,
        }),
      });

      if (response.ok) {
        setBroadcastMessage('');
        setBroadcastRecipients([]);
        setShowBroadcastDialog(false);
        toast.success(`Рассылка отправлена ${recipients.length} получателям`);
        fetchMessages();
      } else {
        toast.error('Ошибка отправки рассылки');
      }
    } catch (error) {
      toast.error('Ошибка подключения к серверу');
    }
  };

  const handleUpdateProfile = async (displayName: string) => {
    if (!currentUser) return;
    
    try {
      const response = await fetch(API_URLS.users, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentUser.id, displayName }),
      });

      if (response.ok) {
        setCurrentUser(prev => prev ? { ...prev, displayName } : null);
        toast.success('Профиль обновлён');
        fetchUsers();
      }
    } catch (error) {
      toast.error('Ошибка обновления профиля');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      const response = await fetch(`${API_URLS.users}?id=${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Пользователь удалён');
        fetchUsers();
        if (selectedChat?.id === userId) {
          setSelectedChat(null);
        }
      } else {
        toast.error('Ошибка удаления пользователя');
      }
    } catch (error) {
      toast.error('Ошибка подключения к серверу');
    }
  };

  const getChatMessages = (userId: number) => {
    return messages.filter(m => 
      (m.fromUserId === currentUser?.id && m.to.includes(userId)) ||
      (m.fromUserId === userId && m.to.includes(currentUser?.id || 0))
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const formatMoscowTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Europe/Moscow'
    });
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
        <Card className="w-full max-w-md p-8 space-y-6 border-2 border-primary/20 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
                <Icon name="Mail" size={32} className="text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-primary">RusBakery Mail</h1>
            <p className="text-muted-foreground">Корпоративная почта пекарни</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="text"
                placeholder="email@RusBakery"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="border-primary/30"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="border-primary/30"
              />
            </div>

            <Button onClick={handleLogin} className="w-full" size="lg">
              <Icon name="LogIn" size={18} className="mr-2" />
              Войти
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const otherUsers = users.filter(u => u.id !== currentUser.id);

  return (
    <div className="h-screen flex bg-background">
      <div className="w-80 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 border-2 border-primary">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {currentUser.firstName[0]}{currentUser.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold text-foreground">{currentUser.displayName || currentUser.firstName}</h2>
                <p className="text-xs text-muted-foreground">{currentUser.email}</p>
              </div>
            </div>
            
            <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Icon name="Settings" size={18} />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Настройки профиля</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Отображаемое имя</Label>
                    <Input
                      defaultValue={currentUser.displayName || currentUser.firstName}
                      onBlur={(e) => handleUpdateProfile(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${currentUser.isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                    <span className="text-sm">{currentUser.isOnline ? 'Онлайн' : 'Не в сети'}</span>
                  </div>
                  <Button 
                    variant="destructive" 
                    className="w-full mt-4"
                    onClick={() => {
                      setCurrentUser(null);
                      setShowProfileDialog(false);
                      toast.success('Вы вышли из системы');
                    }}
                  >
                    <Icon name="LogOut" size={16} className="mr-2" />
                    Выйти
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {currentUser.role === 'owner' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
                <DialogTrigger asChild>
                  <Button className="flex-1" size="sm">
                    <Icon name="UserPlus" size={16} className="mr-2" />
                    Создать
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Новый сотрудник</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Имя</Label>
                      <Input
                        value={newUserData.firstName}
                        onChange={(e) => setNewUserData(prev => ({ ...prev, firstName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Фамилия</Label>
                      <Input
                        value={newUserData.lastName}
                        onChange={(e) => setNewUserData(prev => ({ ...prev, lastName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email (без @RusBakery)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={newUserData.email}
                          onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                        />
                        <span className="text-sm text-muted-foreground">@RusBakery</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Пароль</Label>
                      <Input
                        type="password"
                        value={newUserData.password}
                        onChange={(e) => setNewUserData(prev => ({ ...prev, password: e.target.value }))}
                      />
                    </div>
                    <Button onClick={handleCreateUser} className="w-full">Создать</Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showBroadcastDialog} onOpenChange={setShowBroadcastDialog}>
                <DialogTrigger asChild>
                  <Button variant="secondary" size="sm">
                    <Icon name="Megaphone" size={16} className="mr-2" />
                    Рассылка
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Массовая рассылка</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Получатели</Label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={broadcastRecipients.length === 0}
                            onCheckedChange={(checked) => {
                              if (checked) setBroadcastRecipients([]);
                            }}
                          />
                          <label className="text-sm font-medium">Все сотрудники</label>
                        </div>
                        {otherUsers.map(user => (
                          <div key={user.id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={broadcastRecipients.includes(user.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setBroadcastRecipients(prev => [...prev, user.id]);
                                } else {
                                  setBroadcastRecipients(prev => prev.filter(id => id !== user.id));
                                }
                              }}
                            />
                            <label className="text-sm">{user.displayName || user.firstName} ({user.email})</label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Сообщение</Label>
                      <Textarea
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                        placeholder="Введите текст рассылки..."
                        rows={4}
                      />
                    </div>
                    <Button onClick={handleBroadcast} className="w-full">
                      <Icon name="Send" size={16} className="mr-2" />
                      Отправить
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              </div>
              
              <Dialog open={showEmployeesDialog} onOpenChange={setShowEmployeesDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <Icon name="Users" size={16} className="mr-2" />
                    Все сотрудники
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Список сотрудников ({users.length})</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="max-h-96">
                    <div className="space-y-2">
                      {users.map(user => (
                        <div key={user.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-primary/20 text-primary">
                                {user.firstName[0]}{user.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.displayName || user.firstName} {user.lastName}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                              <span className="text-xs text-muted-foreground">
                                {user.isOnline ? 'Онлайн' : 'Офлайн'}
                              </span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${user.role === 'owner' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                              {user.role === 'owner' ? 'Владелец' : 'Работник'}
                            </span>
                            {user.role !== 'owner' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  if (confirm(`Удалить сотрудника ${user.displayName || user.firstName}?`)) {
                                    handleDeleteUser(user.id);
                                  }
                                }}
                              >
                                <Icon name="Trash2" size={16} className="text-destructive" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {otherUsers.map(user => (
              <button
                key={user.id}
                onClick={() => setSelectedChat(user)}
                className={`w-full p-3 rounded-lg transition-all hover:bg-accent/50 ${
                  selectedChat?.id === user.id ? 'bg-accent' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {user.firstName[0]}{user.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${
                      user.isOnline ? 'bg-green-500' : 'bg-gray-500'
                    }`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm">{user.displayName || user.firstName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            <div className="p-4 border-b border-border bg-card">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {selectedChat.firstName[0]}{selectedChat.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{selectedChat.displayName || selectedChat.firstName} {selectedChat.lastName}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedChat.isOnline ? 'онлайн' : `был(а) в сети ${formatMoscowTime(selectedChat.lastSeen)}`}
                  </p>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {getChatMessages(selectedChat.id).map(msg => {
                  const isOwn = msg.fromUserId === currentUser.id;
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] p-3 rounded-2xl ${
                        isOwn 
                          ? 'bg-primary text-primary-foreground rounded-br-sm' 
                          : 'bg-muted text-foreground rounded-bl-sm'
                      }`}>
                        <p className="text-sm">{msg.content}</p>
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {msg.attachments.map((file, idx) => (
                              <a
                                key={idx}
                                href={file.url}
                                download={file.name}
                                className="flex items-center gap-2 p-2 rounded bg-black/10 hover:bg-black/20 transition-colors"
                              >
                                <Icon name="File" size={14} />
                                <span className="text-xs truncate">{file.name}</span>
                                <span className="text-xs opacity-60">({(file.size / 1024).toFixed(1)} KB)</span>
                              </a>
                            ))}
                          </div>
                        )}
                        <p className="text-xs opacity-70 mt-1">
                          {formatMoscowTime(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border bg-card space-y-2">
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-xs">
                      <Icon name="File" size={12} />
                      <span className="truncate max-w-[150px]">{file.name}</span>
                      <button
                        onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="hover:text-destructive"
                      >
                        <Icon name="X" size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                    }
                  }}
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Icon name="Paperclip" size={18} />
                </Button>
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Написать сообщение..."
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} size="icon">
                  <Icon name="Send" size={18} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <Icon name="MessageSquare" size={64} className="mx-auto opacity-20" />
              <p className="text-lg font-medium">Выберите чат</p>
              <p className="text-sm">Начните общение с коллегами</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;