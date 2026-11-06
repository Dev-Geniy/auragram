// Тесты правил безопасности. Запуск: npm run test:rules (нужны Java 11+ и интернет для эмулятора).
import { readFileSync } from 'node:fs';
import { test, before, after } from 'node:test';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, query, where, getDocs, serverTimestamp, deleteField } from 'firebase/firestore';

let env;
const A = 'userAAAAAA1', B = 'userBBBBBB2', C = 'userCCCCCC3';
const chatAB = [A, B].sort().join('_');

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-auragram',
    firestore: { rules: readFileSync('firebase/firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
after(async () => { await env.cleanup(); });

const msg = (over = {}) => ({
  chatId: chatAB, text: 'привет', imageUrl: '', senderId: A, receiverId: B,
  createdAt: serverTimestamp(), isRead: false, ...over,
});

async function seed() {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'messages/m1'), { chatId: chatAB, text: 'hi', senderId: A, receiverId: B, createdAt: new Date(), isRead: false });
    await setDoc(doc(db, 'users', A), { name: 'A' });
  });
}

test('участник читает чат запросом по chatId', async () => {
  await seed();
  const db = env.authenticatedContext(B).firestore();
  await assertSucceeds(getDocs(query(collection(db, 'messages'), where('chatId', '==', chatAB))));
});

test('счётчик непрочитанных: receiverId + isRead', async () => {
  await seed();
  const db = env.authenticatedContext(B).firestore();
  await assertSucceeds(getDocs(query(collection(db, 'messages'), where('receiverId', '==', B), where('isRead', '==', false))));
});

test('посторонний не читает чужой чат', async () => {
  await seed();
  const db = env.authenticatedContext(C).firestore();
  await assertFails(getDocs(query(collection(db, 'messages'), where('chatId', '==', chatAB))));
  await assertFails(getDoc(doc(db, 'messages/m1')));
});

test('нельзя отправить от чужого имени и в чужой чат', async () => {
  await seed();
  const db = env.authenticatedContext(C).firestore();
  await assertFails(addDoc(collection(db, 'messages'), msg({ senderId: A })));
  await assertFails(addDoc(collection(db, 'messages'), msg({ senderId: C, receiverId: B })));
});

test('участник может отправить сообщение', async () => {
  await seed();
  const db = env.authenticatedContext(A).firestore();
  await assertSucceeds(addDoc(collection(db, 'messages'), msg()));
});

test('лишние поля в сообщении запрещены', async () => {
  await seed();
  const db = env.authenticatedContext(A).firestore();
  await assertFails(addDoc(collection(db, 'messages'), msg({ isAdmin: true })));
});

test('получатель отмечает прочитанным, но не меняет текст', async () => {
  await seed();
  const db = env.authenticatedContext(B).firestore();
  await assertSucceeds(updateDoc(doc(db, 'messages/m1'), { isRead: true }));
  await assertFails(updateDoc(doc(db, 'messages/m1'), { text: 'взлом' }));
});

test('автор правит текст, чужой — нет', async () => {
  await seed();
  await assertSucceeds(updateDoc(doc(env.authenticatedContext(A).firestore(), 'messages/m1'), { text: 'new', isEdited: true }));
  await assertFails(updateDoc(doc(env.authenticatedContext(C).firestore(), 'messages/m1'), { text: 'new' }));
});

test('реакции: своя можно, чужую подделать нельзя', async () => {
  await seed();
  const dbB = env.authenticatedContext(B).firestore();
  await assertSucceeds(updateDoc(doc(dbB, 'messages/m1'), { [`reactions.${B}`]: '👍' }));
  await assertFails(updateDoc(doc(dbB, 'messages/m1'), { [`reactions.${A}`]: '👍' }));
  await assertSucceeds(updateDoc(doc(dbB, 'messages/m1'), { [`reactions.${B}`]: deleteField() }));
});

test('профиль: читают все вошедшие, пишет только владелец', async () => {
  await seed();
  await assertSucceeds(getDoc(doc(env.authenticatedContext(B).firestore(), 'users', A)));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'users', A)));
  await assertFails(setDoc(doc(env.authenticatedContext(B).firestore(), 'users', A), { name: 'hack' }, { merge: true }));
  await assertSucceeds(setDoc(doc(env.authenticatedContext(A).firestore(), 'users', A), { name: 'ok' }, { merge: true }));
});

test('удалить сообщение могут только участники', async () => {
  await seed();
  await assertFails(deleteDoc(doc(env.authenticatedContext(C).firestore(), 'messages/m1')));
  await assertSucceeds(deleteDoc(doc(env.authenticatedContext(B).firestore(), 'messages/m1')));
});
