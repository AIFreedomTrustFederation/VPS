package org.aift.cloud;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

public class AiftRuntimeService extends Service {
    private static final String CHANNEL_ID = "aift-runtime";

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(this, CHANNEL_ID)
                : new Notification.Builder(this);
        Notification notification = builder
                .setContentTitle("AIFT Cloud runtime")
                .setContentText("Keeping local dashboard ports open")
                .setSmallIcon(android.R.drawable.stat_sys_upload_done)
                .build();
        startForeground(1001, notification);
        AiftRuntimeManager.startRuntime(this);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        AiftRuntimeManager.startRuntime(this);
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "AIFT Runtime", NotificationManager.IMPORTANCE_LOW);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }
}
