import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Camera,
  Map,
  Trophy,
  TrendingUp,
  Target,
  Zap,
  Award,
  Calendar,
  BarChart3
} from 'lucide-react';
import axios from 'axios';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    try {
      const response = await axios.get('/api/users/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankProgress = () => {
    const ranks = ['Beginner', 'Eco Warrior', 'Environmental Guardian', 'Planet Protector', 'Legend'];
    const currentIndex = ranks.indexOf(user?.rank || 'Beginner');
    const nextRank = ranks[currentIndex + 1];
    
    const thresholds = [0, 50, 150, 300, 500];
    const currentThreshold = thresholds[currentIndex];
    const nextThreshold = thresholds[currentIndex + 1] || 500;
    
    const progress = nextRank 
      ? ((user?.ecoPoints - currentThreshold) / (nextThreshold - currentThreshold)) * 100
      : 100;
    
    return { nextRank, progress: Math.max(0, Math.min(100, progress)), nextThreshold };
  };

  const { nextRank, progress, nextThreshold } = getRankProgress();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.username}! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Ready to make a difference today?
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Eco Points
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {user?.ecoPoints || 0}
                  </p>
                </div>
                <div className="h-12 w-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <Zap className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Reports
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {user?.reportCount || 0}
                  </p>
                </div>
                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Accuracy
                  </p>
                  <p className="text-2xl font-bold text-purple-600">
                    {user?.accuracy || 0}%
                  </p>
                </div>
                <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <Target className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Streak
                  </p>
                  <p className="text-2xl font-bold text-orange-600">
                    {user?.streakDays || 0} days
                  </p>
                </div>
                <div className="h-12 w-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Start making a difference right now
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Link to="/scanner">
                    <Button className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                      <Camera className="h-6 w-6" />
                      <span>Scan Waste</span>
                    </Button>
                  </Link>
                  <Link to="/map">
                    <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                      <Map className="h-6 w-6" />
                      <span>View Map</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Rank Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5" />
                  <span>Rank Progress</span>
                </CardTitle>
                <CardDescription>
                  Current rank: <Badge variant="secondary">{user?.rank}</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {nextRank ? (
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Progress to {nextRank}</span>
                      <span>{user?.ecoPoints}/{nextThreshold} points</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {nextThreshold - (user?.ecoPoints || 0)} more points to reach {nextRank}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
                    <p className="font-medium">Congratulations!</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      You've reached the highest rank!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Reports */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Reports</CardTitle>
                <CardDescription>
                  Your latest waste detection reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.stats?.recentReports?.length > 0 ? (
                  <div className="space-y-4">
                    {stats.stats.recentReports.map((report, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            report.wasteType === 'Plastic' ? 'bg-blue-500' :
                            report.wasteType === 'Chemical' ? 'bg-red-500' :
                            report.wasteType === 'Oil' ? 'bg-orange-500' :
                            'bg-purple-500'
                          }`} />
                          <div>
                            <p className="font-medium">{report.wasteType}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {new Date(report.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {report.confidence}% confidence
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      No reports yet. Start scanning to see your reports here!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Latest Badges */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5" />
                  <span>Latest Badges</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {user?.badges?.length > 0 ? (
                  <div className="space-y-3">
                    {user.badges.slice(0, 3).map((badge, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="text-2xl">{badge.icon || '🏆'}</div>
                        <div>
                          <p className="font-medium text-sm">{badge.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {badge.description}
                          </p>
                        </div>
                      </div>
                    ))}
                    <Link to="/badges">
                      <Button variant="outline" size="sm" className="w-full">
                        View All Badges
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Trophy className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      No badges yet. Keep reporting to earn your first badge!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Waste Type Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Waste Types Detected</CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.stats?.wasteTypeStats?.length > 0 ? (
                  <div className="space-y-3">
                    {stats.stats.wasteTypeStats.map((stat, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{stat._id}</span>
                        <Badge variant="secondary">{stat.count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
                    No waste types detected yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Daily Goal */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Daily Goal</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {user?.streakDays > 0 ? '✅' : '🎯'}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {user?.streakDays > 0 
                      ? 'Goal completed today!' 
                      : 'Report 1 waste item today'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

