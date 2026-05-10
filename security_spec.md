# Data Invariants

1. A ticket must point to a valid user ID.
2. Users can only edit their own profiles.
3. Users can only read chats if they are in the `userIds` array.
4. Users can only add messages to chats if they are in the `userIds` array.
5. Tickets can only be modified by their seller.
6. Only admins can modify user roles or edit other people's tickets.
7. Only admins can create system notifications, or maybe system functions. If the app creates notifications via the client, they must be rigorously validated.

# Dirty Dozen Payloads

1. Attempting to set admin role in a user profile update.
2. Attempting to update a ticket belonging to someone else.
3. Attempting to create a ticket with a fake sellerId.
4. Attempting to modify ticket `status` bypassing state rules.
5. Attempting to read a chat between two other users.
6. Attempting to send a message as someone else in a chat.
7. Attempting to add a message to a chat the user is not part of.
8. Injecting a massive string into a message.
9. Injecting a massive string into a ticket field.
10. Creating a notification for another user without admin rights.
11. Reading an entire users collection list without where constraints.
12. Creating a user document with someone else's ID.
