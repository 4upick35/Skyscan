package com.umbrellacorp.skyscan;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.widget.RemoteViews;

public class ClockWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        BitmapFactory.Options opts = new BitmapFactory.Options();
        opts.inScaled = false;
        Bitmap face = BitmapFactory.decodeResource(context.getResources(), R.drawable.clock_face, opts);

        for (int id : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.clock_widget_layout);
            views.setImageViewBitmap(R.id.widget_clock_image, face);
            manager.updateAppWidget(id, views);
        }
    }
}
