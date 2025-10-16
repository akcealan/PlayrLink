import 'react-native-url-polyfill/auto';
import React, { useState, useEffect } from 'react';
import { Modal, StatusBar, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from './supabaseClient';
import RNPickerSelect from 'react-native-picker-select';

const Stack = createNativeStackNavigator();

function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // GİRİŞ: Sadece kullanıcı adı ve şifre ile
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Uyarı', 'Lütfen e-posta ve şifreyi girin.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error || !data || !data.session) {
      Alert.alert('Giriş Hatası', error?.message || 'Giriş başarısız.');
    } else {
      navigation.replace('Home');
    }
  };

  // KAYIT: Kullanıcı adı, e-posta ve şifre ile
  const handleSignUp = async () => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Uyarı', 'Lütfen tüm alanları doldurun.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } }
    });
    setLoading(false);
    if (error) {
      if (error.message && error.message.includes('already registered')) {
        Alert.alert('Kayıt Hatası', 'Bu e-posta ile zaten bir hesap var.');
      } else {
        Alert.alert('Kayıt Hatası', error.message || 'Kayıt başarısız.');
      }
    } else {
      Alert.alert('Başarılı', 'Kayıt başarılı!');
    }
  };

  return (
    <View style={styles.background}>
      <View style={styles.card}>
        <Text style={styles.title}>PlayrLink</Text>
        <Text style={styles.subtitle}>Giriş / Üyelik</Text>
        {/* GİRİŞ İÇİN: Sadece kullanıcı adı ve şifre */}
        <TextInput
          style={styles.input}
          placeholder="Kullanıcı Adı"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
          placeholderTextColor="#aaa"
        />
        {/* Kayıt için e-posta alanı */}
        <TextInput
          style={styles.input}
          placeholder="E-posta"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholderTextColor="#aaa"
        />
        <TextInput
          style={styles.input}
          placeholder="Şifre"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholderTextColor="#aaa"
        />
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? "Giriş Yapılıyor..." : "Giriş Yap"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.buttonOutline, loading && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={loading}
        >
          <Text style={[styles.buttonText, styles.buttonOutlineText]}>
            {loading ? "Kayıt Olunuyor..." : "Üye Ol"}
          </Text>
        </TouchableOpacity>
        <StatusBar style="auto" />
      </View>
    </View>
  );
}

function HomeScreen({ navigation }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [game, setGame] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [userId, setUserId] = useState('');
  const [requestsModal, setRequestsModal] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [messagesModal, setMessagesModal] = useState(false);
  const [acceptedRequests, setAcceptedRequests] = useState([]);
  const [chatModal, setChatModal] = useState(false);
  const [chatUser, setChatUser] = useState(null);
  const [chatRoomId, setChatRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  React.useEffect(() => {
    const fetchRooms = async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error) setRooms(data || []);
      setLoading(false);
    };

    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        if (profile) setUsername(profile.username);
      }
    };

    const fetchProfiles = async () => {
      const { data, error } = await supabase.from('profiles').select('id, username');
      if (!error) setProfiles(data || []);
    };

    fetchRooms();
    fetchProfile();
    fetchProfiles();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigation.replace('Login');
  };

  // Oda kurma işlemi
  const handleCreateRoom = async () => {
    setModalVisible(true);
  };

  const handleRoomSubmit = async () => {
    if (!game || !['LoL', 'Valorant', 'FIFA', 'CS2'].includes(game) || !description.trim() || !duration.trim()) {
      Alert.alert('Uyarı', 'Tüm alanları doldurun ve bir oyun seçin.');
      return;
    }
    const { data, error } = await supabase
      .from('rooms')
      .insert([{ 
        game, 
        description, 
        duration_minutes: Number(duration), 
        owner_id: userId,
        created_at: new Date().toISOString()
      }]);
    if (!error) {
      setGame('');
      setDescription('');
      setDuration('');
      setModalVisible(false);
      // Oda listesini güncelle
      const { data: newRooms } = await supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: false });
      setRooms(newRooms || []);
    } else {
      Alert.alert('Hata', error.message || 'Oda oluşturulamadı.');
    }
  };

  // Oda detaylarını gösteren modalı aç
  const openRoomDetail = (room) => {
    setSelectedRoom(room);
  };

  // Oda silme işlemi
  const handleDeleteRoom = async (roomId) => {
    await supabase.from('rooms').delete().eq('id', roomId);
    setSelectedRoom(null);
    // Oda listesini güncelle
    const { data: newRooms } = await supabase
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: false });
    setRooms(newRooms || []);
  };

  // İstek atma işlemi (örnek)
  const handleRequest = async () => {
    if (!selectedRoom || !userId) return;
    // Aynı kullanıcı aynı odaya tekrar istek atamasın
    const { data: existing, error: checkError } = await supabase
      .from('room_request')
      .select('id')
      .eq('room_id', selectedRoom.id)
      .eq('user_id', userId)
      .single();

    if (existing) {
      Alert.alert('Uyarı', 'Bu odaya zaten istek gönderdiniz.');
      return;
    }

    const { error } = await supabase
      .from('room_request')
      .insert([{
        room_id: selectedRoom.id,
        user_id: userId,
        created_at: new Date().toISOString()
      }]);
    if (!error) {
      Alert.alert('İstek Atıldı', 'Odaya istek gönderildi!');
    } else {
      Alert.alert('Hata', error?.message || 'İstek gönderilemedi.');
    }
  };

  // İstekleri fetch et
  const fetchRequests = async () => {
    if (!userId || rooms.length === 0) return;

    const ownerRoomIds = rooms.filter(r => r.owner_id === userId).map(r => r.id);
    console.log('userId:', userId);
    console.log('ownerRoomIds:', ownerRoomIds);

    if (ownerRoomIds.length === 0) {
      setIncomingRequests([]);
      return;
    }

    const { data, error } = await supabase
      .from('room_request')
      .select('*')
      .eq('accepted', false)
      .in('room_id', ownerRoomIds);

    console.log('room_request data:', data, 'error:', error);

    if (!error) setIncomingRequests(data || []);
  };

  const fetchAcceptedRequests = async () => {
    if (!userId || rooms.length === 0) return;
    // Oda sahibi olduğun odalar
    const ownerRoomIds = rooms.filter(r => r.owner_id === userId).map(r => r.id);

    // Hem oda sahibi olduğun odalardaki kabul edilenler
    // Hem de istek attığın ve kabul edilen odalar
    const { data: ownerAccepted, error: ownerError } = await supabase
      .from('room_request')
      .select('*')
      .eq('accepted', true)
      .in('room_id', ownerRoomIds);

    const { data: userAccepted, error: userError } = await supabase
      .from('room_request')
      .select('*')
      .eq('accepted', true)
      .eq('user_id', userId);

    // İki listeyi birleştir, tekrarları kaldır
    const allAccepted = [
      ...(ownerAccepted || []),
      ...((userAccepted || []).filter(u =>
        !(ownerAccepted || []).some(o => o.id === u.id)
      ))
    ];

    setAcceptedRequests(allAccepted);
  };

  useEffect(() => {
    if (requestsModal) fetchRequests();
    // rooms veya userId değişince de fetch et
  }, [requestsModal, rooms, userId]);

  useEffect(() => {
    if (messagesModal) fetchAcceptedRequests();
  }, [messagesModal, rooms, userId]);

  useEffect(() => {
    if (chatModal && chatRoomId && chatUser) {
      console.log('Mesaj modalı açıldı:', chatUser, chatRoomId);
      fetchMessages();
    }
  }, [chatModal, chatRoomId, chatUser]);

  const fetchMessages = async () => {
    if (!chatRoomId || !userId || !chatUser) return;
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', chatRoomId)
      .in('sender_id', [userId, chatUser])
      .in('receiver_id', [userId, chatUser])
      .order('created_at', { ascending: true });

    // Eğer yukarıdaki çalışmazsa, aşağıdaki alternatifi kullan:
    // const { data, error } = await supabase
    //   .from('messages')
    //   .select('*')
    //   .eq('room_id', chatRoomId)
    //   .in('sender_id', [userId, chatUser])
    //   .in('receiver_id', [userId, chatUser])
    //   .order('created_at', { ascending: true });

    if (!error) setMessages(data || []);
    console.log('fetchMessages:', data, error);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    await supabase.from('messages').insert([{
      room_id: chatRoomId,
      sender_id: userId,
      receiver_id: chatUser,
      content: newMessage,
    }]);
    setNewMessage('');
    fetchMessages();
  };

  const getUsername = (user_id) => {
    const user = profiles.find(p => p.id === user_id);
    return user ? user.username : user_id;
  };

  const handleAcceptRequest = async (item) => {
    await supabase.from('room_request').update({ accepted: true }).eq('id', item.id);
    Alert.alert('İstek Kabul Edildi', `${getUsername(item.user_id)} kullanıcısının isteği kabul edildi!`);
    fetchRequests && fetchRequests();
  };

  useEffect(() => {
    setChatModal(false);
  }, []);

  useEffect(() => {
    if (!chatRoomId) return;

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${chatRoomId}` },
        (payload) => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatRoomId]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={[styles.background, { justifyContent: 'flex-start', flex: 1 }]}>
        <View style={styles.topRow}>
          {/* Sol üst kullanıcı adı */}
          <View style={styles.topLeftUser}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
              {username ? `@${username}` : ''}
            </Text>
          </View>
          {/* Sağ üstte mesajlar ve istekler butonları yan yana */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.requestsButton} onPress={() => setMessagesModal(true)}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Mesajlar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.requestsButton} onPress={() => setRequestsModal(true)}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>İstekler</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={[styles.title, { marginTop: 30, color: '#fff' }]}>İlanlar</Text>
        {loading ? (
          <Text style={{ color: '#fff', marginTop: 20 }}>Yükleniyor...</Text>
        ) : rooms.length === 0 ? (
          <Text style={{ color: '#fff', marginTop: 20 }}>Hiç ilan yok.</Text>
        ) : (
          <FlatList
            data={rooms.filter(room => {
              const created = new Date(room.created_at);
              const now = new Date();
              const diffMs = now - created;
              const diffMin = Math.floor(diffMs / 60000);
              return diffMin < room.duration_minutes;
            })}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 16 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              // Kalan süre hesaplama
              const created = new Date(item.created_at);
              const now = new Date();
              const diffMs = now - created;
              const diffMin = Math.floor(diffMs / 60000);
              const kalan = Math.max(item.duration_minutes - diffMin, 0);

              // Oda sahibinin kullanıcı adını bul
              const owner = profiles.find(p => p.id === item.owner_id);

              return (
                <Pressable onPress={() => openRoomDetail(item)}>
                  <View style={styles.roomCard}>
                    <Text style={styles.roomTitle}>{item.game}</Text>
                    <Text style={styles.roomDesc}>{item.description}</Text>
                    <Text style={styles.roomTime}>Kalan Süre: {kalan} dk</Text>
                    <Text style={styles.roomOwner}>
                      İlan Sahibi: {owner ? owner.username : item.owner_id}
                    </Text>
                  </View>
                </Pressable>
              );
            }}
          />
        )}
        {/* Çıkış yap butonu */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Çıkış Yap</Text>
        </TouchableOpacity>
        {/* Oda kur butonu */}
        <TouchableOpacity style={styles.createRoomButton} onPress={handleCreateRoom}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Oda Kur</Text>
        </TouchableOpacity>

        {/* Oda kurma modalı */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={{
              flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'
            }}>
              <View style={{
                backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '85%'
              }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Oda Kur</Text>
                <RNPickerSelect
                  onValueChange={setGame}
                  value={game}
                  placeholder={{ label: 'Oyun Seçin', value: '' }}
                  useNativeAndroidPickerStyle={false}
                  style={{
                    inputIOS: {
                      height: 48,
                      backgroundColor: '#f4f4f6',
                      borderRadius: 8,
                      paddingHorizontal: 14,
                      fontSize: 16,
                      marginBottom: 14,
                      color: '#232946',
                    },
                    inputAndroid: {
                      height: 48,
                      backgroundColor: '#f4f4f6',
                      borderRadius: 8,
                      paddingHorizontal: 14,
                      fontSize: 16,
                      marginBottom: 14,
                      color: '#232946',
                    },
                    iconContainer: {
                      top: 16,
                      right: 12,
                    },
                  }}
                  items={[
                    { label: 'LoL', value: 'LoL' },
                    { label: 'Valorant', value: 'Valorant' },
                    { label: 'FIFA', value: 'FIFA' },
                    { label: 'CS2', value: 'CS2' },
                  ]}
                  Icon={() => (
                    <Text style={{ fontSize: 18, color: '#232946' }}>▼</Text>
                  )}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Açıklama"
                  value={description}
                  onChangeText={setDescription}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Süre (dk)"
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="numeric"
                />
                <TouchableOpacity style={styles.button} onPress={handleRoomSubmit}>
                  <Text style={styles.buttonText}>Oda Kur</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.buttonOutline]} onPress={() => setModalVisible(false)}>
                  <Text style={[styles.buttonText, styles.buttonOutlineText]}>İptal</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Oda detay modalı */}
        <Modal visible={!!selectedRoom} animationType="slide" transparent>
          <View style={{
            flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'
          }}>
            <View style={{
              backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '85%'
            }}>
              {selectedRoom && (
                <>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>{selectedRoom.game}</Text>
                  <Text style={{ marginBottom: 8 }}>{selectedRoom.description}</Text>
                  <Text style={{ marginBottom: 8 }}>Süre: {selectedRoom.duration_minutes} dk</Text>
                  {/* Oda sil ve istek at butonları */}
                  {selectedRoom.owner_id === userId ? (
                    <>
                      <TouchableOpacity style={[styles.button, { backgroundColor: '#d9534f' }]} onPress={() => handleDeleteRoom(selectedRoom.id)}>
                        <Text style={styles.buttonText}>Odayı Sil</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.button, styles.buttonDisabled]} disabled>
                        <Text style={styles.buttonText}>İstek At (Kendi Odan)</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity style={[styles.button, styles.buttonOutline]} onPress={handleRequest}>
                        <Text style={[styles.buttonText, styles.buttonOutlineText]}>İstek At</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity style={[styles.button, styles.buttonOutline]} onPress={() => setSelectedRoom(null)}>
                    <Text style={[styles.buttonText, styles.buttonOutlineText]}>Kapat</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* İstekler modalı */}
        <Modal visible={requestsModal} animationType="slide" transparent>
          <View style={{
            flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'
          }}>
            <View style={{
              backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '85%', maxHeight: '80%'
            }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Gelen İstekler</Text>
              {incomingRequests.length === 0 ? (
                <Text>Hiç istek yok.</Text>
              ) : (
                <FlatList
                  data={incomingRequests}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                    <View style={styles.requestCard}>
                      <Text style={styles.requestText}>
                        <Text style={{ fontWeight: 'bold' }}>Kullanıcı: </Text>
                        {getUsername(item.user_id)}
                      </Text>
                      <Text style={styles.requestText}>
                        <Text style={{ fontWeight: 'bold' }}>Oda ID: </Text>
                        {item.room_id}
                      </Text>
                      <Text style={styles.requestTime}>
                        {new Date(item.created_at).toLocaleString()}
                      </Text>
                      <TouchableOpacity
                        style={[styles.button, { marginTop: 8, backgroundColor: '#4caf50' }]}
                        onPress={() => handleAcceptRequest(item)}
                      >
                        <Text style={styles.buttonText}>Kabul Et</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                />
              )}
              <TouchableOpacity style={[styles.button, styles.buttonOutline]} onPress={() => setRequestsModal(false)}>
                <Text style={[styles.buttonText, styles.buttonOutlineText]}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Mesajlar modalı (kabul edilen istekler için) */}
        <Modal
          visible={messagesModal}
          animationType="slide"
          transparent
          onRequestClose={() => setMessagesModal(false)}
        >
          <View style={{
            flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'
          }}>
            <View style={{
              backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '85%', maxHeight: '80%'
            }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Mesajlar</Text>
              {acceptedRequests.length === 0 ? (
                <Text>Hiç kabul edilen istek yok.</Text>
              ) : (
                <FlatList
                  data={acceptedRequests}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => {
                    const room = rooms.find(r => r.id === item.room_id);
                    if (!room) return null;
                    const created = new Date(room.created_at);
                    const now = new Date();
                    const diffMs = now - created;
                    const diffMin = Math.floor(diffMs / 60000);
                    const isActive = diffMin < room.duration_minutes;

                    return (
                      <View style={styles.requestCard}>
                        <Text style={styles.requestText}>
                          <Text style={{ fontWeight: 'bold' }}>Kullanıcı: </Text>
                          {getUsername(item.user_id)}
                        </Text>
                        <Text style={styles.requestText}>
                          <Text style={{ fontWeight: 'bold' }}>Oda ID: </Text>
                          {item.room_id}
                        </Text>
                        {/* Sadece aktif oda ise mesajlaş butonu göster */}
                        {isActive && (
                          <TouchableOpacity
                            style={[styles.button, { marginTop: 8, backgroundColor: '#393e6c' }]}
                            onPress={() => {
                              const otherUserId = item.user_id === userId ? room.owner_id : item.user_id;
                              setMessages([]);
                              setChatUser(otherUserId);
                              setChatRoomId(item.room_id);
                              setMessagesModal(false);
                              setTimeout(() => {
                                setChatModal(true);
                              }, 300);
                            }}
                          >
                            <Text style={styles.buttonText}>Mesajlaş</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  }}
                />
              )}
              <TouchableOpacity style={[styles.button, styles.buttonOutline]} onPress={() => setMessagesModal(false)}>
                <Text style={[styles.buttonText, styles.buttonOutlineText]}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Mesajlaşma modalı */}
        <Modal visible={chatModal} animationType="slide" transparent>
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.7)',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <View style={{
              backgroundColor: '#fff',
              borderRadius: 16,
              padding: 32,
              width: '90%',
              maxHeight: '80%',
              alignItems: 'center',
              flex: 1, // EKLE
            }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>
                {getUsername(chatUser)} ile Mesajlaş
              </Text>
              <FlatList
                data={messages}
                keyExtractor={item => item.id?.toString()}
                style={{ width: '100%', flexGrow: 1, marginBottom: 12, minHeight: 100, maxHeight: 350 }}
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
                renderItem={({ item }) => (
                  <View style={{
                    alignSelf: item.sender_id === userId ? 'flex-end' : 'flex-start',
                    backgroundColor: item.sender_id === userId ? '#393e6c' : '#e0e0e0',
                    borderRadius: 8,
                    padding: 8,
                    marginVertical: 4,
                    maxWidth: '75%',
                  }}>
                    <Text style={{ color: item.sender_id === userId ? '#fff' : '#232946' }}>{item.content}</Text>
                    <Text style={{ fontSize: 10, color: '#888', alignSelf: 'flex-end' }}>
                      {new Date(item.created_at).toLocaleTimeString()}
                    </Text>
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={{ color: '#888', textAlign: 'center', marginTop: 24 }}>Henüz mesaj yok.</Text>
                }
              />
              <View style={{ flexDirection: 'row', marginTop: 8, width: '100%' }}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0, height: 44 }]}
                  placeholder="Mesaj yaz..."
                  value={newMessage}
                  onChangeText={setNewMessage}
                />
                <TouchableOpacity
                  style={{
                    backgroundColor: '#393e6c',
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: 8,
                    height: 44,
                    paddingHorizontal: 14,
                    minWidth: 60,
                  }}
                  onPress={sendMessage}
                >
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>Gönder</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.button, styles.buttonOutline, { marginTop: 8, width: '100%' }]}
                onPress={() => setChatModal(false)}
              >
                <Text style={[styles.buttonText, styles.buttonOutlineText]}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#232946',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '90%',
    maxWidth: 350,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#232946',
    marginBottom: 6,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    color: '#393e6c',
    marginBottom: 22,
  },
  input: {
    width: '100%',
    height: 48,
    backgroundColor: '#f4f4f6',
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#232946',
  },
  button: {
    width: '100%',
    height: 48,
    backgroundColor: '#232946',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  buttonOutline: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#232946',
  },
  buttonOutlineText: {
    color: '#232946',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  roomCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  roomTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#232946',
    marginBottom: 4,
  },
  roomGame: {
    fontSize: 16,
    color: '#393e6c',
    marginBottom: 2,
  },
  roomDesc: {
    fontSize: 15,
    color: '#232946',
    marginBottom: 2,
  },
  roomTime: {
    fontSize: 13,
    color: '#888',
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
  },
  topLeftUser: {
    backgroundColor: 'rgba(35,41,70,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutButton: {
    position: 'absolute',
    left: 18,
    bottom: 28,
    backgroundColor: '#393e6c',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    zIndex: 10,
  },
  createRoomButton: {
    position: 'absolute',
    right: 18,
    bottom: 28,
    backgroundColor: '#393e6c',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    zIndex: 10,
  },
  requestsButton: {
    backgroundColor: '#393e6c',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 16,
    zIndex: 10,
  },
  requestCard: {
    backgroundColor: '#f4f4f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  requestText: {
    fontSize: 16,
    color: '#232946',
    marginBottom: 4,
  },
  requestTime: {
    fontSize: 14,
    color: '#888',
  },
  roomOwner: {
    fontSize: 13,
    color: '#393e6c',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
