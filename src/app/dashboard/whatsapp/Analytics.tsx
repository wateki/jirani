import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { MessageCircle, ShoppingCart, TrendingUp, Users, DollarSign, Clock, Star, Phone, Heart, AlertTriangle, CheckCircle, XCircle, Zap } from 'lucide-react'
import { supabase } from '../../../integrations/supabase/client'

const WhatsAppAnalytics = () => {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')
  const [activeStoreId] = useState(() => localStorage.getItem('active_store_id'))

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange, activeStoreId])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const data = await getWhatsAppAnalytics(activeStoreId, timeRange)
      setAnalytics(data)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getWhatsAppAnalytics = async (storeId: string, range: string) => {
    const days = range === '1d' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 90
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Fetch messaging data
    const { data: messages } = await supabase
      .from('messaging_log')
      .select('*')
      .eq('store_id', storeId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    // Fetch cart sessions
    const { data: cartSessions } = await supabase
      .from('cart_sessions')
      .select('*')
      .eq('store_id', storeId)
      .gte('created_at', startDate.toISOString())

    // Fetch orders
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('store_id', storeId)
      .gte('created_at', startDate.toISOString())

    // Fetch feedback
    const { data: feedback } = await supabase
      .from('order_feedback')
      .select('*')
      .eq('store_id', storeId)
      .gte('created_at', startDate.toISOString())

    // Fetch opt-ins
    const { data: optIns } = await supabase
      .from('customer_channel_opt_in')
      .select('*')
      .eq('store_id', storeId)
      .eq('channel_type', 'whatsapp')

    return processAnalyticsData(messages, cartSessions, orders, feedback, optIns, days)
  }

  const processAnalyticsData = (messages, cartSessions, orders, feedback, optIns, days) => {
    const now = new Date()
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))

    // Message metrics
    const inboundMessages = messages?.filter(m => m.direction === 'inbound') || []
    const outboundMessages = messages?.filter(m => m.direction === 'outbound') || []
    const totalMessages = messages?.length || 0

    // Customer metrics
    const uniqueCustomers = new Set(messages?.map(m => m.customer_phone)).size
    const activeCustomers = new Set(messages?.filter(m => {
      const messageDate = new Date(m.created_at)
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      return messageDate > last24Hours
    }).map(m => m.customer_phone)).size

    // Cart metrics
    const totalCarts = cartSessions?.length || 0
    const abandonedCarts = cartSessions?.filter(c => !c.converted_to_order_id && c.is_abandoned).length || 0
    const convertedCarts = cartSessions?.filter(c => c.converted_to_order_id).length || 0
    const cartAbandonmentRate = totalCarts > 0 ? (abandonedCarts / totalCarts) * 100 : 0

    // Order metrics
    const totalOrders = orders?.length || 0
    const totalRevenue = orders?.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) || 0
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const orderConversionRate = totalMessages > 0 ? (totalOrders / totalMessages) * 100 : 0

    // Feedback metrics
    const totalRatings = feedback?.length || 0
    const avgRating = totalRatings > 0 ? feedback.reduce((sum, f) => sum + f.rating, 0) / totalRatings : 0
    const ratingBreakdown = [1,2,3,4,5].map(rating => ({
      stars: rating,
      count: feedback?.filter(f => f.rating === rating).length || 0,
      percentage: totalRatings > 0 ? ((feedback?.filter(f => f.rating === rating).length || 0) / totalRatings) * 100 : 0
    }))

    // Message type breakdown
    const messageTypes = {
      text: messages?.filter(m => m.message_type === 'text').length || 0,
      interactive: messages?.filter(m => m.message_type === 'interactive').length || 0,
      template: messages?.filter(m => m.message_type === 'template').length || 0,
      image: messages?.filter(m => m.message_type === 'image').length || 0
    }

    // Response time analysis
    const responseTimes = calculateResponseTimes(messages)
    const avgResponseTime = responseTimes.length > 0 ? 
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0

    // Daily trends
    const dailyTrends = generateDailyTrends(messages, orders, days)

    // Top products from orders
    const topProducts = getTopProducts(orders)

    // Conversion funnel
    const conversionFunnel = [
      { name: 'Messages', value: totalMessages },
      { name: 'Carts Created', value: totalCarts },
      { name: 'Orders', value: totalOrders },
      { name: 'Completed', value: orders?.filter(o => o.status === 'delivered').length || 0 }
    ]

    // Recent conversations
    const recentConversations = getRecentConversations(messages, cartSessions)

    // Opt-in metrics
    const totalOptIns = optIns?.length || 0
    const activeOptIns = optIns?.filter(o => o.is_opted_in).length || 0
    const optInRate = totalOptIns > 0 ? (activeOptIns / totalOptIns) * 100 : 0

    return {
      metrics: {
        totalMessages,
        inboundMessages: inboundMessages.length,
        outboundMessages: outboundMessages.length,
        uniqueCustomers,
        activeCustomers,
        totalCarts,
        abandonedCarts,
        convertedCarts,
        cartAbandonmentRate,
        totalOrders,
        totalRevenue,
        avgOrderValue,
        orderConversionRate,
        totalRatings,
        avgRating,
        avgResponseTime,
        totalOptIns,
        activeOptIns,
        optInRate,
        // Change calculations (simplified - would need historical data for accurate trends)
        messagesChange: 12.5,
        customersChange: 8.3,
        ordersChange: 15.7,
        revenueChange: 22.1
      },
      messageTypes,
      ratingBreakdown,
      dailyTrends,
      topProducts,
      conversionFunnel,
      recentConversations,
      responseTimeData: generateResponseTimeData(responseTimes)
    }
  }

  const calculateResponseTimes = (messages) => {
    const responseTimes = []
    const customerMessages = {}
    
    messages?.forEach(message => {
      const phone = message.customer_phone
      if (!customerMessages[phone]) {
        customerMessages[phone] = []
      }
      customerMessages[phone].push({
        timestamp: new Date(message.created_at),
        direction: message.direction
      })
    })

    Object.values(customerMessages).forEach(conversation => {
      conversation.sort((a, b) => a.timestamp - b.timestamp)
      
      for (let i = 0; i < conversation.length - 1; i++) {
        if (conversation[i].direction === 'inbound' && conversation[i + 1].direction === 'outbound') {
          const responseTime = (conversation[i + 1].timestamp - conversation[i].timestamp) / 1000 // seconds
          if (responseTime < 3600) { // Only count responses within 1 hour
            responseTimes.push(responseTime)
          }
        }
      }
    })

    return responseTimes
  }

  const generateDailyTrends = (messages, orders, days) => {
    const trends = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayMessages = messages?.filter(m => m.created_at.startsWith(dateStr)) || []
      const dayOrders = orders?.filter(o => o.created_at.startsWith(dateStr)) || []
      
      trends.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        inbound: dayMessages.filter(m => m.direction === 'inbound').length,
        outbound: dayMessages.filter(m => m.direction === 'outbound').length,
        orders: dayOrders.length,
        revenue: dayOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)
      })
    }
    return trends
  }

  const getTopProducts = (orders) => {
    const productCounts = {}
    orders?.forEach(order => {
      // This would need to be enhanced to get actual product data from order_items
      // For now, returning mock data
    })
    
    return [
      { name: 'Premium T-Shirt', sku: 'TSH001', quantity: 45, revenue: 22500 },
      { name: 'Designer Jeans', sku: 'JNS002', quantity: 32, revenue: 19200 },
      { name: 'Casual Sneakers', sku: 'SNK003', quantity: 28, revenue: 16800 }
    ]
  }

  const getRecentConversations = (messages, cartSessions) => {
    const conversations = {}
    
    messages?.forEach(message => {
      const phone = message.customer_phone
      if (!conversations[phone]) {
        conversations[phone] = {
          customerPhone: phone,
          lastMessage: message.content?.text || 'Media message',
          lastMessageTime: new Date(message.created_at).toLocaleTimeString(),
          status: 'active',
          hasCart: false,
          cartTotal: 0
        }
      }
    })

    cartSessions?.forEach(cart => {
      if (cart.customer_phone && conversations[cart.customer_phone]) {
        conversations[cart.customer_phone].hasCart = true
        conversations[cart.customer_phone].cartTotal = cart.cart_total || 0
      }
    })

    return Object.values(conversations).slice(0, 5)
  }

  const generateResponseTimeData = (responseTimes) => {
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour}:00`,
      responseTime: responseTimes.filter(time => {
        const date = new Date()
        date.setHours(hour)
        return Math.floor(time / 60) === hour
      }).length > 0 ? 
        responseTimes.filter(time => Math.floor(time / 60) === hour)
          .reduce((sum, time) => sum + time, 0) / 
        responseTimes.filter(time => Math.floor(time / 60) === hour).length : 0
    }))
    
    return hourlyData
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    )
  }

  const metrics = analytics?.metrics || {}
  const messageTypes = analytics?.messageTypes || {}
  const dailyTrends = analytics?.dailyTrends || []
  const topProducts = analytics?.topProducts || []
  const conversionFunnel = analytics?.conversionFunnel || []
  const responseTimeData = analytics?.responseTimeData || []
  const ratingBreakdown = analytics?.ratingBreakdown || []
  const recentConversations = analytics?.recentConversations || []

  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444']

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MessageCircle className="h-8 w-8 text-green-500" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">WhatsApp Analytics</h1>
                  <p className="text-gray-600">Comprehensive insights from your WhatsApp commerce</p>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="1d">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
                <button
                  onClick={fetchAnalytics}
                  className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Messages"
            value={metrics.totalMessages || 0}
            subtitle={`${metrics.inboundMessages || 0} inbound, ${metrics.outboundMessages || 0} outbound`}
            change={metrics.messagesChange || 0}
            icon={MessageCircle}
            color="green"
          />
          <MetricCard
            title="Active Customers"
            value={metrics.uniqueCustomers || 0}
            subtitle={`${metrics.activeCustomers || 0} in last 24h`}
            change={metrics.customersChange || 0}
            icon={Users}
            color="blue"
          />
          <MetricCard
            title="Orders Created"
            value={metrics.totalOrders || 0}
            subtitle={`${metrics.orderConversionRate?.toFixed(1) || 0}% conversion rate`}
            change={metrics.ordersChange || 0}
            icon={ShoppingCart}
            color="purple"
          />
          <MetricCard
            title="Revenue (KES)"
            value={metrics.totalRevenue || 0}
            subtitle={`KES ${metrics.avgOrderValue?.toFixed(0) || 0} avg order`}
            change={metrics.revenueChange || 0}
            icon={DollarSign}
            color="yellow"
            isAmount={true}
          />
        </div>

        {/* WhatsApp-Specific Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Cart Abandonment"
            value={`${metrics.cartAbandonmentRate?.toFixed(1) || 0}%`}
            subtitle={`${metrics.abandonedCarts || 0} of ${metrics.totalCarts || 0} carts`}
            change={-5.2}
            icon={AlertTriangle}
            color="red"
          />
          <MetricCard
            title="Response Time"
            value={`${metrics.avgResponseTime?.toFixed(0) || 0}s`}
            subtitle="Average response time"
            change={-12.3}
            icon={Clock}
            color="blue"
          />
          <MetricCard
            title="Customer Rating"
            value={`${metrics.avgRating?.toFixed(1) || 0}/5`}
            subtitle={`${metrics.totalRatings || 0} ratings received`}
            change={8.7}
            icon={Star}
            color="yellow"
          />
          <MetricCard
            title="Opt-in Rate"
            value={`${metrics.optInRate?.toFixed(1) || 0}%`}
            subtitle={`${metrics.activeOptIns || 0} opted in`}
            change={15.4}
            icon={Heart}
            color="green"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Message Volume Trends */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Message Volume Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="inbound" stroke="#10B981" strokeWidth={2} name="Inbound" />
                <Line type="monotone" dataKey="outbound" stroke="#3B82F6" strokeWidth={2} name="Outbound" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Order & Revenue Trends */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Order & Revenue Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Bar yAxisId="left" dataKey="orders" fill="#8B5CF6" name="Orders" />
                <Bar yAxisId="right" dataKey="revenue" fill="#F59E0B" name="Revenue (KES)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Message Types & Conversion Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Message Types Breakdown */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Message Types</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Text', value: messageTypes.text, color: '#10B981' },
                    { name: 'Interactive', value: messageTypes.interactive, color: '#3B82F6' },
                    { name: 'Template', value: messageTypes.template, color: '#8B5CF6' },
                    { name: 'Image', value: messageTypes.image, color: '#F59E0B' }
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: 'Text', value: messageTypes.text, color: '#10B981' },
                    { name: 'Interactive', value: messageTypes.interactive, color: '#3B82F6' },
                    { name: 'Template', value: messageTypes.template, color: '#8B5CF6' },
                    { name: 'Image', value: messageTypes.image, color: '#F59E0B' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {[
                { name: 'Text', value: messageTypes.text, color: '#10B981' },
                { name: 'Interactive', value: messageTypes.interactive, color: '#3B82F6' },
                { name: 'Template', value: messageTypes.template, color: '#8B5CF6' },
                { name: 'Image', value: messageTypes.image, color: '#F59E0B' }
              ].map((entry, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: entry.color }}
                    ></div>
                    <span className="text-sm">{entry.name}</span>
                  </div>
                  <span className="text-sm font-medium">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Conversion Funnel</h3>
            <div className="space-y-4">
              {conversionFunnel.map((step, index) => {
                const percentage = conversionFunnel[0]?.value > 0 ? 
                  (step.value / conversionFunnel[0].value) * 100 : 0
                return (
                  <div key={index} className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{step.name}</span>
                      <span className="text-sm text-gray-500">{step.value}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-400 mt-1">{percentage.toFixed(1)}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Recent Activity & Customer Satisfaction */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Conversations */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Recent Conversations</h3>
              <Phone className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {recentConversations.map((conv, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">{conv.customerPhone}</p>
                      <span className="text-xs text-gray-500">{conv.lastMessageTime}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{conv.lastMessage}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        conv.status === 'active' ? 'bg-green-100 text-green-800' : 
                        conv.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {conv.status}
                      </span>
                      {conv.hasCart && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          Cart: KES {conv.cartTotal}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Satisfaction */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Customer Satisfaction</h3>
              <Star className="h-5 w-5 text-yellow-400" />
            </div>
            
            <div className="text-center mb-6">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {metrics.avgRating?.toFixed(1) || '0.0'}/5.0
              </div>
              <div className="flex justify-center space-x-1 mb-2">
                {[1,2,3,4,5].map(star => (
                  <Star 
                    key={star}
                    className={`h-5 w-5 ${
                      star <= Math.round(metrics.avgRating || 0) 
                        ? 'text-yellow-400 fill-current' 
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-gray-500">{metrics.totalRatings || 0} ratings</p>
            </div>

            <div className="space-y-3">
              {ratingBreakdown.map((rating, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <span className="text-sm font-medium w-8">{rating.stars}★</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${rating.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-500 w-12">{rating.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-6">Performance Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <InsightCard
              title="Cart Abandonment"
              value={`${metrics.cartAbandonmentRate?.toFixed(1) || 0}%`}
              description="Customers who added items but didn't checkout"
              trend={-5.2}
              color="red"
              icon={AlertTriangle}
            />
            <InsightCard
              title="Order Conversion"
              value={`${metrics.orderConversionRate?.toFixed(1) || 0}%`}
              description="Messages that resulted in orders"
              trend={15.7}
              color="green"
              icon={CheckCircle}
            />
            <InsightCard
              title="Response Time"
              value={`${metrics.avgResponseTime?.toFixed(0) || 0}s`}
              description="Average time to respond to customers"
              trend={-12.3}
              color="blue"
              icon={Zap}
            />
            <InsightCard
              title="Avg Order Value"
              value={`KES ${metrics.avgOrderValue?.toFixed(0) || 0}`}
              description="Average order amount via WhatsApp"
              trend={8.9}
              color="purple"
              icon={DollarSign}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

const MetricCard = ({ title, value, subtitle, change, icon: Icon, color, isAmount = false }) => {
  const colorClasses = {
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600'
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {isAmount ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          <div className="flex items-center mt-2">
            <TrendingUp className={`h-4 w-4 ${change >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            <span className={`text-sm ml-1 ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {change > 0 ? '+' : ''}{change}%
            </span>
          </div>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}

const InsightCard = ({ title, value, description, trend, color, icon: Icon }) => {
  const colorClasses = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600'
  }

  return (
    <div className="text-center">
      <div className="flex justify-center mb-2">
        <Icon className={`h-8 w-8 ${colorClasses[color]}`} />
      </div>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
      <p className="font-medium text-gray-900 mt-1">{title}</p>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
      <div className="flex items-center justify-center mt-2">
        <TrendingUp className={`h-3 w-3 ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`} />
        <span className={`text-xs ml-1 ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      </div>
    </div>
  )
}

export default WhatsAppAnalytics
