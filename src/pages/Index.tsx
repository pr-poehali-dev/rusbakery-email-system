import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  role: 'owner' | 'worker';
  isOnline: boolean;
  lastSeen: Date;
}

interface Message {
  id: string;
  from: string;
  to: string[];
  subject?: string;
  content: string;
  timestamp: Date;
  attachments?: File[];
  isBroadcast: boolean;
}

const Index = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      email: 'owner@RusBakery',
      password: 'admin',
      firstName: 'Владимир',
      lastName: 'Петров',
      displayName: 'Владимир',
      role: 'owner',
      isOnline: true,
      lastSeen: new Date(),
    },
  ]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChat, setSelectedChat] = useState<User | null>(null);
  const [messageText, setMessageText] = useState('');
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showBroadcastDialog, setShowBroadcastDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  
  const [newUserData, setNewUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  const [broadcastRecipients, setBroadcastRecipients] = useState<string[]>([]);
  const [broadcastMessage, setBroadcastMessage] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    
    const interval = setInterval(() => {
      setUsers(prev => prev.map(u => ({
        ...u,
        isOnline: Math.random() > 0.3,
      })));
    }, 2000);

    return () => clearInterval(interval);
  }, [currentUser]);

  const handleLogin = () => {
    const user = users.find(u => u.email === loginEmail && u.password === loginPassword);
    if (user) {
      setCurrentUser(user);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isOnline: true } : u));
      toast.success(`Добро пожаловать, ${user.displayName || user.firstName}!`);
    } else {
      toast.error('Неверный email или пароль');
    }
  };

  const handleCreateUser = () => {
    if (!newUserData.firstName || !newUserData.lastName || !newUserData.email || !newUserData.password) {
      toast.error('Заполните все поля');
      return;
    }

    const newUser: User = {
      id: Date.now().toString(),
      email: newUserData.email + '@RusBakery',
      password: newUserData.password,
      firstName: newUserData.firstName,
      lastName: newUserData.lastName,
      displayName: newUserData.firstName,
      role: 'worker',
      isOnline: false,
      lastSeen: new Date(),
    };

    setUsers(prev => [...prev, newUser]);
    setNewUserData({ firstName: '', lastName: '', email: '', password: '' });
    setShowUserDialog(false);
    toast.success(`Пользователь ${newUser.email} создан`);
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    if (selectedChat?.id === userId) {
      setSelectedChat(null);
    }
    toast.success('Пользователь удалён');
  };

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedChat) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      from: currentUser!.id,
      to: [selectedChat.id],
      content: messageText,
      timestamp: new Date(),
      isBroadcast: false,
    };

    setMessages(prev => [...prev, newMessage]);
    setMessageText('');
    toast.success('Сообщение отправлено');
  };

  const handleBroadcast = () => {
    if (!broadcastMessage.trim()) {
      toast.error('Введите текст сообщения');
      return;
    }

    const recipients = broadcastRecipients.length > 0 
      ? broadcastRecipients 
      : users.filter(u => u.id !== currentUser?.id).map(u => u.id);

    const newMessage: Message = {
      id: Date.now().toString(),
      from: currentUser!.id,
      to: recipients,
      content: broadcastMessage,
      timestamp: new Date(),
      isBroadcast: true,
    };

    setMessages(prev => [...prev, newMessage]);
    setBroadcastMessage('');
    setBroadcastRecipients([]);
    setShowBroadcastDialog(false);
    toast.success(`Рассылка отправлена ${recipients.length} получателям`);
  };

  const handleUpdateProfile = (displayName: string) => {
    if (!currentUser) return;
    
    setCurrentUser(prev => prev ? { ...prev, displayName } : null);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, displayName } : u));
    toast.success('Профиль обновлён');
  };

  const getChatMessages = (userId: string) => {
    return messages.filter(m => 
      (m.from === currentUser?.id && m.to.includes(userId)) ||
      (m.from === userId && m.to.includes(currentUser?.id || ''))
    ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
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
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {currentUser.role === 'owner' && (
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
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {otherUsers.map(user => {
              const unreadCount = getChatMessages(user.id).filter(m => m.from === user.id).length;
              return (
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
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{user.displayName || user.firstName}</p>
                        {currentUser.role === 'owner' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteUser(user.id);
                            }}
                          >
                            <Icon name="Trash2" size={14} />
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                </button>
              );
            })}
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
                    {selectedChat.isOnline ? 'онлайн' : `был(а) в сети ${selectedChat.lastSeen.toLocaleTimeString()}`}
                  </p>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {getChatMessages(selectedChat.id).map(msg => {
                  const isOwn = msg.from === currentUser.id;
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] p-3 rounded-2xl ${
                        isOwn 
                          ? 'bg-primary text-primary-foreground rounded-br-sm' 
                          : 'bg-muted text-foreground rounded-bl-sm'
                      }`}>
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {msg.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border bg-card">
              <div className="flex gap-2">
                <Button variant="outline" size="icon">
                  <Icon name="Paperclip" size={18} />
                </Button>
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
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