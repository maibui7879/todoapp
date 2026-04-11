import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' }, // Cho phép Frontend gọi tới (có thể đổi thành domain thật sau này)
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('NotificationGateway');
  
  // Lưu trữ danh sách User đang online. 
  // Map <UserId, Set<SocketId>> (Vì 1 user có thể mở app trên nhiều tab web cùng lúc)
  private connectedUsers = new Map<string, Set<string>>();

  // KHI FRONTEND MỞ WEB VÀ KẾT NỐI
  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    
    if (userId) {
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(client.id);
      this.logger.log(`📱 User ${userId} đã online (Socket ID: ${client.id})`);
    }
  }

  // KHI FRONTEND ĐÓNG TAB HOẶC TẮT MẠNG
  handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;
    
    if (userId && this.connectedUsers.has(userId)) {
      this.connectedUsers.get(userId)!.delete(client.id);
      
      // Nếu user tắt hết tất cả các tab web thì xóa khỏi danh sách online
      if (this.connectedUsers.get(userId)!.size === 0) {
        this.connectedUsers.delete(userId);
      }
    }
    this.logger.log(`❌ Client ngắt kết nối: ${client.id}`);
  }

  // HÀM DÙNG ĐỂ SERVICE GỌI VÀO KHI MUỐN BẮN THÔNG BÁO CHO AI ĐÓ
  sendNotificationToUser(userId: string, payload: any) {
    const userSockets = this.connectedUsers.get(userId);
    
    // Kiểm tra xem người này có đang mở web không
    if (userSockets && userSockets.size > 0) {
      userSockets.forEach((socketId) => {
        // Phát sự kiện có tên 'new-notification' xuống Frontend
        this.server.to(socketId).emit('new-notification', payload);
      });
      this.logger.log(`🚀 Đã bắn Real-time Notif tới User ${userId}`);
    }
  }
}
