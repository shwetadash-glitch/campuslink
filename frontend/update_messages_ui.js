const fs = require('fs');
const file = 'C:\\Users\\dashs\\campuselink\\frontend\\src\\app\\dashboard\\messages\\page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update rendering
content = content.replace(
    `<div className="font-semibold text-sm text-gray-900">{contact.name}</div>`,
    `<div className="font-semibold text-sm text-gray-900 flex items-center justify-between">
                        <span>{contact.name}</span>
                        {contact.unread_count ? (
                          <span className="w-2.5 h-2.5 bg-blue-600 rounded-full"></span>
                        ) : null}
                      </div>`
);

// Update polling to also fetch contacts
content = content.replace(
    `const fetchMsgs = () => {
      messagesApi.getConversation(activeContact.id).then((data) => {
        setMessages(data);
        scrollToBottom();
      });
    };`,
    `const fetchMsgs = () => {
      messagesApi.getConversation(activeContact.id).then((data) => {
        setMessages(data);
        scrollToBottom();
      });
      // Also silently update contacts to get latest unread counts
      messagesApi.getContacts().then((data) => setContacts(data));
    };`
);

fs.writeFileSync(file, content);
console.log('Successfully updated page.tsx with unread indicators');
